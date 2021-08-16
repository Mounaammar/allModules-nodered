"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRunnerProcess = void 0;
const _1 = require("./");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const Logger_1 = require("../src/Logger");
const config = require("../config");
class WorkflowRunnerProcess {
    constructor() {
        this.startedAt = new Date();
        this.childExecutions = {};
    }
    static async stopProcess() {
        setTimeout(() => {
            process.exit(0);
        }, 30000);
    }
    async runWorkflow(inputData) {
        process.on('SIGTERM', WorkflowRunnerProcess.stopProcess);
        process.on('SIGINT', WorkflowRunnerProcess.stopProcess);
        const logger = this.logger = Logger_1.getLogger();
        n8n_workflow_1.LoggerProxy.init(logger);
        this.data = inputData;
        logger.verbose('Initializing n8n sub-process', { pid: process.pid, workflowId: this.data.workflowData.id });
        let className;
        let tempNode;
        let filePath;
        this.startedAt = new Date();
        const nodeTypesData = {};
        for (const nodeTypeName of Object.keys(this.data.nodeTypeData)) {
            className = this.data.nodeTypeData[nodeTypeName].className;
            filePath = this.data.nodeTypeData[nodeTypeName].sourcePath;
            const tempModule = require(filePath);
            try {
                tempNode = new tempModule[className]();
            }
            catch (error) {
                throw new Error(`Error loading node "${nodeTypeName}" from: "${filePath}"`);
            }
            nodeTypesData[nodeTypeName] = {
                type: tempNode,
                sourcePath: filePath,
            };
        }
        const nodeTypes = _1.NodeTypes();
        await nodeTypes.init(nodeTypesData);
        const credentialTypes = _1.CredentialTypes();
        await credentialTypes.init(inputData.credentialsTypeData);
        const credentialsOverwrites = _1.CredentialsOverwrites();
        await credentialsOverwrites.init(inputData.credentialsOverwrite);
        const externalHooks = _1.ExternalHooks();
        await externalHooks.init();
        if (inputData.workflowData.settings !== undefined && inputData.workflowData.settings.saveExecutionProgress === true) {
            await _1.Db.init();
        }
        else if (inputData.workflowData.settings !== undefined && inputData.workflowData.settings.saveExecutionProgress !== false && config.get('executions.saveExecutionProgress')) {
            await _1.Db.init();
        }
        else if (inputData.workflowData.settings === undefined && config.get('executions.saveExecutionProgress')) {
            await _1.Db.init();
        }
        let workflowTimeout = config.get('executions.timeout');
        if (this.data.workflowData.settings && this.data.workflowData.settings.executionTimeout) {
            workflowTimeout = this.data.workflowData.settings.executionTimeout;
        }
        if (workflowTimeout > 0) {
            workflowTimeout = Math.min(workflowTimeout, config.get('executions.maxTimeout'));
        }
        this.workflow = new n8n_workflow_1.Workflow({ id: this.data.workflowData.id, name: this.data.workflowData.name, nodes: this.data.workflowData.nodes, connections: this.data.workflowData.connections, active: this.data.workflowData.active, nodeTypes, staticData: this.data.workflowData.staticData, settings: this.data.workflowData.settings });
        const additionalData = await _1.WorkflowExecuteAdditionalData.getBase(this.data.credentials, undefined, workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000);
        additionalData.hooks = this.getProcessForwardHooks();
        additionalData.sendMessageToUI = async (source, message) => {
            if (workflowRunner.data.executionMode !== 'manual') {
                return;
            }
            try {
                await sendToParentProcess('sendMessageToUI', { source, message });
            }
            catch (error) {
                this.logger.error(`There was a problem sending UI data to parent process: "${error.message}"`);
            }
        };
        const executeWorkflowFunction = additionalData.executeWorkflow;
        additionalData.executeWorkflow = async (workflowInfo, additionalData, inputData) => {
            const workflowData = await _1.WorkflowExecuteAdditionalData.getWorkflowData(workflowInfo);
            const runData = await _1.WorkflowExecuteAdditionalData.getRunData(workflowData, inputData);
            await sendToParentProcess('startExecution', { runData });
            const executionId = await new Promise((resolve) => {
                this.executionIdCallback = (executionId) => {
                    resolve(executionId);
                };
            });
            let result;
            try {
                const executeWorkflowFunctionOutput = await executeWorkflowFunction(workflowInfo, additionalData, inputData, executionId, workflowData, runData);
                const workflowExecute = executeWorkflowFunctionOutput.workflowExecute;
                this.childExecutions[executionId] = executeWorkflowFunctionOutput;
                const workflow = executeWorkflowFunctionOutput.workflow;
                result = await workflowExecute.processRunExecutionData(workflow);
                await externalHooks.run('workflow.postExecute', [result, workflowData]);
                await sendToParentProcess('finishExecution', { executionId, result });
                delete this.childExecutions[executionId];
            }
            catch (e) {
                await sendToParentProcess('finishExecution', { executionId });
                delete this.childExecutions[executionId];
                throw e;
            }
            await sendToParentProcess('finishExecution', { executionId, result });
            const returnData = _1.WorkflowHelpers.getDataLastExecutedNodeData(result);
            return returnData.data.main;
        };
        if (this.data.executionData !== undefined) {
            this.workflowExecute = new n8n_core_1.WorkflowExecute(additionalData, this.data.executionMode, this.data.executionData);
            return this.workflowExecute.processRunExecutionData(this.workflow);
        }
        else if (this.data.runData === undefined || this.data.startNodes === undefined || this.data.startNodes.length === 0 || this.data.destinationNode === undefined) {
            this.workflowExecute = new n8n_core_1.WorkflowExecute(additionalData, this.data.executionMode);
            return this.workflowExecute.run(this.workflow, undefined, this.data.destinationNode);
        }
        else {
            this.workflowExecute = new n8n_core_1.WorkflowExecute(additionalData, this.data.executionMode);
            return this.workflowExecute.runPartialWorkflow(this.workflow, this.data.runData, this.data.startNodes, this.data.destinationNode);
        }
    }
    async sendHookToParentProcess(hook, parameters) {
        try {
            await sendToParentProcess('processHook', {
                hook,
                parameters,
            });
        }
        catch (error) {
            this.logger.error(`There was a problem sending hook: "${hook}"`, { parameters, error });
        }
    }
    getProcessForwardHooks() {
        const hookFunctions = {
            nodeExecuteBefore: [
                async (nodeName) => {
                    await this.sendHookToParentProcess('nodeExecuteBefore', [nodeName]);
                },
            ],
            nodeExecuteAfter: [
                async (nodeName, data) => {
                    await this.sendHookToParentProcess('nodeExecuteAfter', [nodeName, data]);
                },
            ],
            workflowExecuteBefore: [
                async () => {
                    await this.sendHookToParentProcess('workflowExecuteBefore', []);
                },
            ],
            workflowExecuteAfter: [
                async (fullRunData, newStaticData) => {
                    await this.sendHookToParentProcess('workflowExecuteAfter', [fullRunData, newStaticData]);
                },
            ],
        };
        const preExecuteFunctions = _1.WorkflowExecuteAdditionalData.hookFunctionsPreExecute();
        for (const key of Object.keys(preExecuteFunctions)) {
            if (hookFunctions[key] === undefined) {
                hookFunctions[key] = [];
            }
            hookFunctions[key].push.apply(hookFunctions[key], preExecuteFunctions[key]);
        }
        return new n8n_workflow_1.WorkflowHooks(hookFunctions, this.data.executionMode, this.data.executionId, this.data.workflowData, { sessionId: this.data.sessionId, retryOf: this.data.retryOf });
    }
}
exports.WorkflowRunnerProcess = WorkflowRunnerProcess;
async function sendToParentProcess(type, data) {
    return new Promise((resolve, reject) => {
        process.send({
            type,
            data,
        }, (error) => {
            if (error) {
                return reject(error);
            }
            resolve();
        });
    });
}
const workflowRunner = new WorkflowRunnerProcess();
process.on('message', async (message) => {
    try {
        if (message.type === 'startWorkflow') {
            await sendToParentProcess('start', {});
            const runData = await workflowRunner.runWorkflow(message.data);
            await sendToParentProcess('end', {
                runData,
            });
            process.exit();
        }
        else if (message.type === 'stopExecution' || message.type === 'timeout') {
            let runData;
            if (workflowRunner.workflowExecute !== undefined) {
                const executionIds = Object.keys(workflowRunner.childExecutions);
                for (const executionId of executionIds) {
                    const childWorkflowExecute = workflowRunner.childExecutions[executionId];
                    runData = childWorkflowExecute.workflowExecute.getFullRunData(workflowRunner.childExecutions[executionId].startedAt);
                    const timeOutError = message.type === 'timeout' ? new n8n_workflow_1.WorkflowOperationError('Workflow execution timed out!') : undefined;
                    await childWorkflowExecute.workflowExecute.processSuccessExecution(workflowRunner.childExecutions[executionId].startedAt, childWorkflowExecute.workflow, timeOutError);
                }
                runData = workflowRunner.workflowExecute.getFullRunData(workflowRunner.startedAt);
                const timeOutError = message.type === 'timeout' ? new n8n_workflow_1.WorkflowOperationError('Workflow execution timed out!') : undefined;
                await workflowRunner.workflowExecute.processSuccessExecution(workflowRunner.startedAt, workflowRunner.workflow, timeOutError);
            }
            else {
                runData = {
                    data: {
                        resultData: {
                            runData: {},
                        },
                    },
                    finished: message.type !== 'timeout',
                    mode: workflowRunner.data.executionMode,
                    startedAt: workflowRunner.startedAt,
                    stoppedAt: new Date(),
                };
                workflowRunner.sendHookToParentProcess('workflowExecuteAfter', [runData]);
            }
            await sendToParentProcess(message.type === 'timeout' ? message.type : 'end', {
                runData,
            });
            process.exit();
        }
        else if (message.type === 'executionId') {
            workflowRunner.executionIdCallback(message.data.executionId);
        }
    }
    catch (error) {
        const executionError = Object.assign(Object.assign({}, error), { name: error.name || 'Error', message: error.message, stack: error.stack });
        await sendToParentProcess('processError', {
            executionError,
        });
        process.exit();
    }
});
//# sourceMappingURL=WorkflowRunnerProcess.js.map