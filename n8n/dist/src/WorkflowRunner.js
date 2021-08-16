"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRunner = void 0;
const _1 = require("./");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const config = require("../config");
const PCancelable = require("p-cancelable");
const path_1 = require("path");
const child_process_1 = require("child_process");
const Queue = require("./Queue");
class WorkflowRunner {
    constructor() {
        this.push = _1.Push.getInstance();
        this.activeExecutions = _1.ActiveExecutions.getInstance();
        this.credentialsOverwrites = _1.CredentialsOverwrites().getAll();
        const executionsMode = config.get('executions.mode');
        if (executionsMode === 'queue') {
            this.jobQueue = Queue.getInstance().getBullObjectInstance();
        }
    }
    processHookMessage(workflowHooks, hookData) {
        workflowHooks.executeHookFunctions(hookData.hook, hookData.parameters);
    }
    processError(error, startedAt, executionMode, executionId) {
        const fullRunData = {
            data: {
                resultData: {
                    error,
                    runData: {},
                },
            },
            finished: false,
            mode: executionMode,
            startedAt,
            stoppedAt: new Date(),
        };
        this.activeExecutions.remove(executionId, fullRunData);
    }
    async run(data, loadStaticData, realtime) {
        const executionsProcess = config.get('executions.process');
        const executionsMode = config.get('executions.mode');
        let executionId;
        if (executionsMode === 'queue' && data.executionMode !== 'manual') {
            executionId = await this.runBull(data, loadStaticData, realtime);
        }
        else if (executionsProcess === 'main') {
            executionId = await this.runMainProcess(data, loadStaticData);
        }
        else {
            executionId = await this.runSubprocess(data, loadStaticData);
        }
        const externalHooks = _1.ExternalHooks();
        if (externalHooks.exists('workflow.postExecute')) {
            this.activeExecutions.getPostExecutePromise(executionId)
                .then(async (executionData) => {
                await externalHooks.run('workflow.postExecute', [executionData, data.workflowData]);
            })
                .catch(error => {
                console.error('There was a problem running hook "workflow.postExecute"', error);
            });
        }
        return executionId;
    }
    async runMainProcess(data, loadStaticData) {
        if (loadStaticData === true && data.workflowData.id) {
            data.workflowData.staticData = await _1.WorkflowHelpers.getStaticDataById(data.workflowData.id);
        }
        const nodeTypes = _1.NodeTypes();
        let executionTimeout;
        let workflowTimeout = config.get('executions.timeout');
        if (data.workflowData.settings && data.workflowData.settings.executionTimeout) {
            workflowTimeout = data.workflowData.settings.executionTimeout;
        }
        if (workflowTimeout > 0) {
            workflowTimeout = Math.min(workflowTimeout, config.get('executions.maxTimeout'));
        }
        const workflow = new n8n_workflow_1.Workflow({ id: data.workflowData.id, name: data.workflowData.name, nodes: data.workflowData.nodes, connections: data.workflowData.connections, active: data.workflowData.active, nodeTypes, staticData: data.workflowData.staticData });
        const additionalData = await _1.WorkflowExecuteAdditionalData.getBase(data.credentials, undefined, workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000);
        const executionId = await this.activeExecutions.add(data, undefined);
        n8n_workflow_1.LoggerProxy.verbose(`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`, { executionId });
        additionalData.hooks = _1.WorkflowExecuteAdditionalData.getWorkflowHooksMain(data, executionId, true);
        additionalData.sendMessageToUI = _1.WorkflowExecuteAdditionalData.sendMessageToUI.bind({ sessionId: data.sessionId });
        let workflowExecution;
        if (data.executionData !== undefined) {
            n8n_workflow_1.LoggerProxy.debug(`Execution ID ${executionId} had Execution data. Running with payload.`, { executionId });
            const workflowExecute = new n8n_core_1.WorkflowExecute(additionalData, data.executionMode, data.executionData);
            workflowExecution = workflowExecute.processRunExecutionData(workflow);
        }
        else if (data.runData === undefined || data.startNodes === undefined || data.startNodes.length === 0 || data.destinationNode === undefined) {
            n8n_workflow_1.LoggerProxy.debug(`Execution ID ${executionId} will run executing all nodes.`, { executionId });
            const workflowExecute = new n8n_core_1.WorkflowExecute(additionalData, data.executionMode);
            workflowExecution = workflowExecute.run(workflow, undefined, data.destinationNode);
        }
        else {
            n8n_workflow_1.LoggerProxy.debug(`Execution ID ${executionId} is a partial execution.`, { executionId });
            const workflowExecute = new n8n_core_1.WorkflowExecute(additionalData, data.executionMode);
            workflowExecution = workflowExecute.runPartialWorkflow(workflow, data.runData, data.startNodes, data.destinationNode);
        }
        this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
        if (workflowTimeout > 0) {
            const timeout = Math.min(workflowTimeout, config.get('executions.maxTimeout')) * 1000;
            executionTimeout = setTimeout(() => {
                this.activeExecutions.stopExecution(executionId, 'timeout');
            }, timeout);
        }
        workflowExecution.then((fullRunData) => {
            clearTimeout(executionTimeout);
            if (workflowExecution.isCanceled) {
                fullRunData.finished = false;
            }
            this.activeExecutions.remove(executionId, fullRunData);
        });
        return executionId;
    }
    async runBull(data, loadStaticData, realtime) {
        const executionId = await this.activeExecutions.add(data, undefined);
        const jobData = {
            executionId,
            loadStaticData: !!loadStaticData,
        };
        let priority = 100;
        if (realtime === true) {
            priority = 50;
        }
        const jobOptions = {
            priority,
            removeOnComplete: true,
            removeOnFail: true,
        };
        const job = await this.jobQueue.add(jobData, jobOptions);
        console.log('Started with ID: ' + job.id.toString());
        const hooks = _1.WorkflowExecuteAdditionalData.getWorkflowHooksWorkerMain(data.executionMode, executionId, data.workflowData, { retryOf: data.retryOf ? data.retryOf.toString() : undefined });
        hooks.executeHookFunctions('workflowExecuteBefore', []);
        const workflowExecution = new PCancelable(async (resolve, reject, onCancel) => {
            onCancel.shouldReject = false;
            onCancel(async () => {
                await Queue.getInstance().stopJob(job);
                const fullRunData = {
                    data: {
                        resultData: {
                            error: new n8n_workflow_1.WorkflowOperationError('Workflow has been canceled!'),
                            runData: {},
                        },
                    },
                    mode: data.executionMode,
                    startedAt: new Date(),
                    stoppedAt: new Date(),
                };
                this.activeExecutions.remove(executionId, fullRunData);
                resolve(fullRunData);
            });
            const jobData = job.finished();
            const queueRecoveryInterval = config.get('queue.bull.queueRecoveryInterval');
            if (queueRecoveryInterval > 0) {
                let watchDogInterval;
                const watchDog = new Promise((res) => {
                    watchDogInterval = setInterval(async () => {
                        const currentJob = await this.jobQueue.getJob(job.id);
                        if (currentJob === null) {
                            res({ success: true });
                        }
                    }, queueRecoveryInterval * 1000);
                });
                const clearWatchdogInterval = () => {
                    if (watchDogInterval) {
                        clearInterval(watchDogInterval);
                        watchDogInterval = undefined;
                    }
                };
                await Promise.race([jobData, watchDog]);
                clearWatchdogInterval();
            }
            else {
                await jobData;
            }
            const executionDb = await _1.Db.collections.Execution.findOne(executionId);
            const fullExecutionData = _1.ResponseHelper.unflattenExecutionData(executionDb);
            const runData = {
                data: fullExecutionData.data,
                finished: fullExecutionData.finished,
                mode: fullExecutionData.mode,
                startedAt: fullExecutionData.startedAt,
                stoppedAt: fullExecutionData.stoppedAt,
            };
            this.activeExecutions.remove(executionId, runData);
            hooks.executeHookFunctions('workflowExecuteAfter', [runData]);
            try {
                let saveDataErrorExecution = config.get('executions.saveDataOnError');
                let saveDataSuccessExecution = config.get('executions.saveDataOnSuccess');
                if (data.workflowData.settings !== undefined) {
                    saveDataErrorExecution = data.workflowData.settings.saveDataErrorExecution || saveDataErrorExecution;
                    saveDataSuccessExecution = data.workflowData.settings.saveDataSuccessExecution || saveDataSuccessExecution;
                }
                const workflowDidSucceed = !runData.data.resultData.error;
                if (workflowDidSucceed === true && saveDataSuccessExecution === 'none' ||
                    workflowDidSucceed === false && saveDataErrorExecution === 'none') {
                    await _1.Db.collections.Execution.delete(executionId);
                }
            }
            catch (err) {
                console.log('Error removing saved execution from database. More details: ', err);
            }
            resolve(runData);
        });
        this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
        return executionId;
    }
    async runSubprocess(data, loadStaticData) {
        let startedAt = new Date();
        const subprocess = child_process_1.fork(path_1.join(__dirname, 'WorkflowRunnerProcess.js'));
        if (loadStaticData === true && data.workflowData.id) {
            data.workflowData.staticData = await _1.WorkflowHelpers.getStaticDataById(data.workflowData.id);
        }
        const executionId = await this.activeExecutions.add(data, subprocess);
        let loadAllNodeTypes = false;
        for (const node of data.workflowData.nodes) {
            if (node.type === 'n8n-nodes-base.executeWorkflow') {
                loadAllNodeTypes = true;
                break;
            }
        }
        let nodeTypeData;
        let credentialTypeData;
        let credentialsOverwrites = this.credentialsOverwrites;
        if (loadAllNodeTypes === true) {
            nodeTypeData = _1.WorkflowHelpers.getAllNodeTypeData();
            const credentialTypes = _1.CredentialTypes();
            credentialTypeData = credentialTypes.credentialTypes;
        }
        else {
            nodeTypeData = _1.WorkflowHelpers.getNodeTypeData(data.workflowData.nodes);
            credentialTypeData = _1.WorkflowHelpers.getCredentialsData(data.credentials);
            credentialsOverwrites = {};
            for (const credentialName of Object.keys(credentialTypeData)) {
                if (this.credentialsOverwrites[credentialName] !== undefined) {
                    credentialsOverwrites[credentialName] = this.credentialsOverwrites[credentialName];
                }
            }
        }
        data.executionId = executionId;
        data.nodeTypeData = nodeTypeData;
        data.credentialsOverwrite = credentialsOverwrites;
        data.credentialsTypeData = credentialTypeData;
        const workflowHooks = _1.WorkflowExecuteAdditionalData.getWorkflowHooksMain(data, executionId);
        subprocess.send({ type: 'startWorkflow', data });
        let executionTimeout;
        let workflowTimeout = config.get('executions.timeout');
        if (data.workflowData.settings && data.workflowData.settings.executionTimeout) {
            workflowTimeout = data.workflowData.settings.executionTimeout;
        }
        const processTimeoutFunction = (timeout) => {
            this.activeExecutions.stopExecution(executionId, 'timeout');
            executionTimeout = setTimeout(() => subprocess.kill(), Math.max(timeout * 0.2, 5000));
        };
        if (workflowTimeout > 0) {
            workflowTimeout = Math.min(workflowTimeout, config.get('executions.maxTimeout')) * 1000;
            executionTimeout = setTimeout(processTimeoutFunction, Math.max(5000, workflowTimeout), workflowTimeout);
        }
        const childExecutionIds = [];
        subprocess.on('message', async (message) => {
            n8n_workflow_1.LoggerProxy.debug(`Received child process message of type ${message.type} for execution ID ${executionId}.`, { executionId });
            if (message.type === 'start') {
                startedAt = new Date();
                if (workflowTimeout > 0) {
                    clearTimeout(executionTimeout);
                    executionTimeout = setTimeout(processTimeoutFunction, workflowTimeout, workflowTimeout);
                }
            }
            else if (message.type === 'end') {
                clearTimeout(executionTimeout);
                this.activeExecutions.remove(executionId, message.data.runData);
            }
            else if (message.type === 'sendMessageToUI') {
                _1.WorkflowExecuteAdditionalData.sendMessageToUI.bind({ sessionId: data.sessionId })(message.data.source, message.data.message);
            }
            else if (message.type === 'processError') {
                clearTimeout(executionTimeout);
                const executionError = message.data.executionError;
                this.processError(executionError, startedAt, data.executionMode, executionId);
            }
            else if (message.type === 'processHook') {
                this.processHookMessage(workflowHooks, message.data);
            }
            else if (message.type === 'timeout') {
                const timeoutError = new n8n_workflow_1.WorkflowOperationError('Workflow execution timed out!');
                this.processError(timeoutError, startedAt, data.executionMode, executionId);
            }
            else if (message.type === 'startExecution') {
                const executionId = await this.activeExecutions.add(message.data.runData);
                childExecutionIds.push(executionId);
                subprocess.send({ type: 'executionId', data: { executionId } });
            }
            else if (message.type === 'finishExecution') {
                const executionIdIndex = childExecutionIds.indexOf(message.data.executionId);
                if (executionIdIndex !== -1) {
                    childExecutionIds.splice(executionIdIndex, 1);
                }
                await this.activeExecutions.remove(message.data.executionId, message.data.result);
            }
        });
        subprocess.on('exit', async (code, signal) => {
            if (signal === 'SIGTERM') {
                n8n_workflow_1.LoggerProxy.debug(`Subprocess for execution ID ${executionId} timed out.`, { executionId });
                const timeoutError = new n8n_workflow_1.WorkflowOperationError('Workflow execution timed out!');
                this.processError(timeoutError, startedAt, data.executionMode, executionId);
            }
            else if (code !== 0) {
                n8n_workflow_1.LoggerProxy.debug(`Subprocess for execution ID ${executionId} finished with error code ${code}.`, { executionId });
                const executionError = new n8n_workflow_1.WorkflowOperationError('Workflow execution process did crash for an unknown reason!');
                this.processError(executionError, startedAt, data.executionMode, executionId);
            }
            for (const executionId of childExecutionIds) {
                await this.activeExecutions.remove(executionId);
            }
            clearTimeout(executionTimeout);
        });
        return executionId;
    }
}
exports.WorkflowRunner = WorkflowRunner;
//# sourceMappingURL=WorkflowRunner.js.map