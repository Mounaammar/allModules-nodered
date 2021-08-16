"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkflowHooksMain = exports.getWorkflowHooksWorkerMain = exports.getWorkflowHooksWorkerExecuter = exports.getWorkflowHooksIntegrated = exports.getBase = exports.sendMessageToUI = exports.executeWorkflow = exports.getWorkflowData = exports.getRunData = exports.hookFunctionsPreExecute = void 0;
const _1 = require("./");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const config = require("../config");
const typeorm_1 = require("typeorm");
const ERROR_TRIGGER_TYPE = config.get('nodes.errorTriggerType');
function executeErrorWorkflow(workflowData, fullRunData, mode, executionId, retryOf) {
    let pastExecutionUrl = undefined;
    if (executionId !== undefined) {
        pastExecutionUrl = `${_1.WebhookHelpers.getWebhookBaseUrl()}execution/${executionId}`;
    }
    if (fullRunData.data.resultData.error !== undefined) {
        const workflowErrorData = {
            execution: {
                id: executionId,
                url: pastExecutionUrl,
                error: fullRunData.data.resultData.error,
                lastNodeExecuted: fullRunData.data.resultData.lastNodeExecuted,
                mode,
                retryOf,
            },
            workflow: {
                id: workflowData.id !== undefined ? workflowData.id.toString() : undefined,
                name: workflowData.name,
            },
        };
        if (workflowData.settings !== undefined && workflowData.settings.errorWorkflow && !(mode === 'error' && workflowData.id && workflowData.settings.errorWorkflow.toString() === workflowData.id.toString())) {
            n8n_workflow_1.LoggerProxy.verbose(`Start external error workflow`, { executionId, errorWorkflowId: workflowData.settings.errorWorkflow.toString(), workflowId: workflowData.id });
            _1.WorkflowHelpers.executeErrorWorkflow(workflowData.settings.errorWorkflow, workflowErrorData);
        }
        else if (mode !== 'error' && workflowData.id !== undefined && workflowData.nodes.some((node) => node.type === ERROR_TRIGGER_TYPE)) {
            n8n_workflow_1.LoggerProxy.verbose(`Start internal error workflow`, { executionId, workflowId: workflowData.id });
            _1.WorkflowHelpers.executeErrorWorkflow(workflowData.id.toString(), workflowErrorData);
        }
    }
}
let throttling = false;
function pruneExecutionData() {
    if (!throttling) {
        n8n_workflow_1.LoggerProxy.verbose('Pruning execution data from database');
        throttling = true;
        const timeout = config.get('executions.pruneDataTimeout');
        const maxAge = config.get('executions.pruneDataMaxAge');
        const date = new Date();
        date.setHours(date.getHours() - maxAge);
        _1.Db.collections.Execution.delete({ stoppedAt: typeorm_1.LessThanOrEqual(date.toISOString()) })
            .then(data => setTimeout(() => {
            throttling = false;
        }, timeout * 1000)).catch(err => throttling = false);
    }
}
function hookFunctionsPush() {
    return {
        nodeExecuteBefore: [
            async function (nodeName) {
                if (this.sessionId === undefined) {
                    return;
                }
                n8n_workflow_1.LoggerProxy.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, { executionId: this.executionId, sessionId: this.sessionId, workflowId: this.workflowData.id });
                const pushInstance = _1.Push.getInstance();
                pushInstance.send('nodeExecuteBefore', {
                    executionId: this.executionId,
                    nodeName,
                }, this.sessionId);
            },
        ],
        nodeExecuteAfter: [
            async function (nodeName, data) {
                if (this.sessionId === undefined) {
                    return;
                }
                n8n_workflow_1.LoggerProxy.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, { executionId: this.executionId, sessionId: this.sessionId, workflowId: this.workflowData.id });
                const pushInstance = _1.Push.getInstance();
                pushInstance.send('nodeExecuteAfter', {
                    executionId: this.executionId,
                    nodeName,
                    data,
                }, this.sessionId);
            },
        ],
        workflowExecuteBefore: [
            async function () {
                n8n_workflow_1.LoggerProxy.debug(`Executing hook (hookFunctionsPush)`, { executionId: this.executionId, sessionId: this.sessionId, workflowId: this.workflowData.id });
                if (this.sessionId === undefined) {
                    return;
                }
                const pushInstance = _1.Push.getInstance();
                pushInstance.send('executionStarted', {
                    executionId: this.executionId,
                    mode: this.mode,
                    startedAt: new Date(),
                    retryOf: this.retryOf,
                    workflowId: this.workflowData.id,
                    sessionId: this.sessionId,
                    workflowName: this.workflowData.name,
                }, this.sessionId);
            },
        ],
        workflowExecuteAfter: [
            async function (fullRunData, newStaticData) {
                n8n_workflow_1.LoggerProxy.debug(`Executing hook (hookFunctionsPush)`, { executionId: this.executionId, sessionId: this.sessionId, workflowId: this.workflowData.id });
                if (this.sessionId === undefined) {
                    return;
                }
                const pushRunData = Object.assign(Object.assign({}, fullRunData), { data: Object.assign(Object.assign({}, fullRunData.data), { resultData: Object.assign(Object.assign({}, fullRunData.data.resultData), { runData: {} }) }) });
                n8n_workflow_1.LoggerProxy.debug(`Save execution progress to database for execution ID ${this.executionId} `, { executionId: this.executionId, workflowId: this.workflowData.id });
                const sendData = {
                    executionId: this.executionId,
                    data: pushRunData,
                    retryOf: this.retryOf,
                };
                const pushInstance = _1.Push.getInstance();
                pushInstance.send('executionFinished', sendData, this.sessionId);
            },
        ],
    };
}
function hookFunctionsPreExecute(parentProcessMode) {
    const externalHooks = _1.ExternalHooks();
    return {
        workflowExecuteBefore: [
            async function (workflow) {
                await externalHooks.run('workflow.preExecute', [workflow, this.mode]);
            },
        ],
        nodeExecuteAfter: [
            async function (nodeName, data, executionData) {
                if (this.workflowData.settings !== undefined) {
                    if (this.workflowData.settings.saveExecutionProgress === false) {
                        return;
                    }
                    else if (this.workflowData.settings.saveExecutionProgress !== true && !config.get('executions.saveExecutionProgress')) {
                        return;
                    }
                }
                else if (!config.get('executions.saveExecutionProgress')) {
                    return;
                }
                try {
                    n8n_workflow_1.LoggerProxy.debug(`Save execution progress to database for execution ID ${this.executionId} `, { executionId: this.executionId, nodeName });
                    const execution = await _1.Db.collections.Execution.findOne(this.executionId);
                    if (execution === undefined) {
                        return undefined;
                    }
                    const fullExecutionData = _1.ResponseHelper.unflattenExecutionData(execution);
                    if (fullExecutionData.finished) {
                        return;
                    }
                    if (fullExecutionData.data === undefined) {
                        fullExecutionData.data = {
                            startData: {},
                            resultData: {
                                runData: {},
                            },
                            executionData: {
                                contextData: {},
                                nodeExecutionStack: [],
                                waitingExecution: {},
                            },
                        };
                    }
                    if (Array.isArray(fullExecutionData.data.resultData.runData[nodeName])) {
                        fullExecutionData.data.resultData.runData[nodeName].push(data);
                    }
                    else {
                        fullExecutionData.data.resultData.runData[nodeName] = [data];
                    }
                    fullExecutionData.data.executionData = executionData.executionData;
                    fullExecutionData.data.resultData.lastNodeExecuted = nodeName;
                    const flattenedExecutionData = _1.ResponseHelper.flattenExecutionData(fullExecutionData);
                    await _1.Db.collections.Execution.update(this.executionId, flattenedExecutionData);
                }
                catch (err) {
                    n8n_workflow_1.LoggerProxy.error(`Failed saving execution progress to database for execution ID ${this.executionId} (hookFunctionsPreExecute, nodeExecuteAfter)`, Object.assign(Object.assign({}, err), { executionId: this.executionId, sessionId: this.sessionId, workflowId: this.workflowData.id }));
                }
            },
        ],
    };
}
exports.hookFunctionsPreExecute = hookFunctionsPreExecute;
function hookFunctionsSave(parentProcessMode) {
    return {
        nodeExecuteBefore: [],
        nodeExecuteAfter: [],
        workflowExecuteBefore: [],
        workflowExecuteAfter: [
            async function (fullRunData, newStaticData) {
                n8n_workflow_1.LoggerProxy.debug(`Executing hook (hookFunctionsSave)`, { executionId: this.executionId, workflowId: this.workflowData.id });
                if (config.get('executions.pruneData')) {
                    pruneExecutionData();
                }
                const isManualMode = [this.mode, parentProcessMode].includes('manual');
                try {
                    if (!isManualMode && _1.WorkflowHelpers.isWorkflowIdValid(this.workflowData.id) === true && newStaticData) {
                        try {
                            await _1.WorkflowHelpers.saveStaticDataById(this.workflowData.id, newStaticData);
                        }
                        catch (e) {
                            n8n_workflow_1.LoggerProxy.error(`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (hookFunctionsSave)`, { executionId: this.executionId, workflowId: this.workflowData.id });
                        }
                    }
                    let saveManualExecutions = config.get('executions.saveDataManualExecutions');
                    if (this.workflowData.settings !== undefined && this.workflowData.settings.saveManualExecutions !== undefined) {
                        saveManualExecutions = this.workflowData.settings.saveManualExecutions;
                    }
                    if (isManualMode && saveManualExecutions === false) {
                        await _1.Db.collections.Execution.delete(this.executionId);
                        return;
                    }
                    let saveDataErrorExecution = config.get('executions.saveDataOnError');
                    let saveDataSuccessExecution = config.get('executions.saveDataOnSuccess');
                    if (this.workflowData.settings !== undefined) {
                        saveDataErrorExecution = this.workflowData.settings.saveDataErrorExecution || saveDataErrorExecution;
                        saveDataSuccessExecution = this.workflowData.settings.saveDataSuccessExecution || saveDataSuccessExecution;
                    }
                    const workflowDidSucceed = !fullRunData.data.resultData.error;
                    if (workflowDidSucceed === true && saveDataSuccessExecution === 'none' ||
                        workflowDidSucceed === false && saveDataErrorExecution === 'none') {
                        if (!isManualMode) {
                            executeErrorWorkflow(this.workflowData, fullRunData, this.mode, undefined, this.retryOf);
                        }
                        await _1.Db.collections.Execution.delete(this.executionId);
                        return;
                    }
                    const fullExecutionData = {
                        data: fullRunData.data,
                        mode: fullRunData.mode,
                        finished: fullRunData.finished ? fullRunData.finished : false,
                        startedAt: fullRunData.startedAt,
                        stoppedAt: fullRunData.stoppedAt,
                        workflowData: this.workflowData,
                    };
                    if (this.retryOf !== undefined) {
                        fullExecutionData.retryOf = this.retryOf.toString();
                    }
                    if (this.workflowData.id !== undefined && _1.WorkflowHelpers.isWorkflowIdValid(this.workflowData.id.toString()) === true) {
                        fullExecutionData.workflowId = this.workflowData.id.toString();
                    }
                    n8n_workflow_1.LoggerProxy.debug(`Save execution data to database for execution ID ${this.executionId}`, {
                        executionId: this.executionId,
                        workflowId: this.workflowData.id,
                        finished: fullExecutionData.finished,
                        stoppedAt: fullExecutionData.stoppedAt,
                    });
                    const executionData = _1.ResponseHelper.flattenExecutionData(fullExecutionData);
                    await _1.Db.collections.Execution.update(this.executionId, executionData);
                    if (fullRunData.finished === true && this.retryOf !== undefined) {
                        await _1.Db.collections.Execution.update(this.retryOf, { retrySuccessId: this.executionId });
                    }
                    if (!isManualMode) {
                        executeErrorWorkflow(this.workflowData, fullRunData, this.mode, this.executionId, this.retryOf);
                    }
                }
                catch (error) {
                    n8n_workflow_1.LoggerProxy.error(`Failed saving execution data to DB on execution ID ${this.executionId}`, {
                        executionId: this.executionId,
                        workflowId: this.workflowData.id,
                        error,
                    });
                    if (!isManualMode) {
                        executeErrorWorkflow(this.workflowData, fullRunData, this.mode, undefined, this.retryOf);
                    }
                }
            },
        ],
    };
}
function hookFunctionsSaveWorker() {
    return {
        nodeExecuteBefore: [],
        nodeExecuteAfter: [],
        workflowExecuteBefore: [],
        workflowExecuteAfter: [
            async function (fullRunData, newStaticData) {
                try {
                    if (_1.WorkflowHelpers.isWorkflowIdValid(this.workflowData.id) === true && newStaticData) {
                        try {
                            await _1.WorkflowHelpers.saveStaticDataById(this.workflowData.id, newStaticData);
                        }
                        catch (e) {
                            n8n_workflow_1.LoggerProxy.error(`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (workflowExecuteAfter)`, { sessionId: this.sessionId, workflowId: this.workflowData.id });
                        }
                    }
                    const workflowDidSucceed = !fullRunData.data.resultData.error;
                    if (workflowDidSucceed === false) {
                        executeErrorWorkflow(this.workflowData, fullRunData, this.mode, undefined, this.retryOf);
                    }
                    const fullExecutionData = {
                        data: fullRunData.data,
                        mode: fullRunData.mode,
                        finished: fullRunData.finished ? fullRunData.finished : false,
                        startedAt: fullRunData.startedAt,
                        stoppedAt: fullRunData.stoppedAt,
                        workflowData: this.workflowData,
                    };
                    if (this.retryOf !== undefined) {
                        fullExecutionData.retryOf = this.retryOf.toString();
                    }
                    if (this.workflowData.id !== undefined && _1.WorkflowHelpers.isWorkflowIdValid(this.workflowData.id.toString()) === true) {
                        fullExecutionData.workflowId = this.workflowData.id.toString();
                    }
                    const executionData = _1.ResponseHelper.flattenExecutionData(fullExecutionData);
                    await _1.Db.collections.Execution.update(this.executionId, executionData);
                    if (fullRunData.finished === true && this.retryOf !== undefined) {
                        await _1.Db.collections.Execution.update(this.retryOf, { retrySuccessId: this.executionId });
                    }
                }
                catch (error) {
                    executeErrorWorkflow(this.workflowData, fullRunData, this.mode, undefined, this.retryOf);
                }
            },
        ],
    };
}
async function getRunData(workflowData, inputData) {
    const mode = 'integrated';
    const requiredNodeTypes = ['n8n-nodes-base.start'];
    let startNode;
    for (const node of workflowData.nodes) {
        if (requiredNodeTypes.includes(node.type)) {
            startNode = node;
            break;
        }
    }
    if (startNode === undefined) {
        throw new Error(`The workflow does not contain a "Start" node and can so not be executed.`);
    }
    inputData = inputData || [
        {
            json: {},
        },
    ];
    const nodeExecutionStack = [];
    nodeExecutionStack.push({
        node: startNode,
        data: {
            main: [inputData],
        },
    });
    const runExecutionData = {
        startData: {},
        resultData: {
            runData: {},
        },
        executionData: {
            contextData: {},
            nodeExecutionStack,
            waitingExecution: {},
        },
    };
    const credentials = await _1.WorkflowCredentials(workflowData.nodes);
    const runData = {
        credentials,
        executionMode: mode,
        executionData: runExecutionData,
        workflowData,
    };
    return runData;
}
exports.getRunData = getRunData;
async function getWorkflowData(workflowInfo) {
    if (workflowInfo.id === undefined && workflowInfo.code === undefined) {
        throw new Error(`No information about the workflow to execute found. Please provide either the "id" or "code"!`);
    }
    if (_1.Db.collections.Workflow === null) {
        await _1.Db.init();
    }
    let workflowData;
    if (workflowInfo.id !== undefined) {
        workflowData = await _1.Db.collections.Workflow.findOne(workflowInfo.id);
        if (workflowData === undefined) {
            throw new Error(`The workflow with the id "${workflowInfo.id}" does not exist.`);
        }
    }
    else {
        workflowData = workflowInfo.code;
    }
    return workflowData;
}
exports.getWorkflowData = getWorkflowData;
async function executeWorkflow(workflowInfo, additionalData, inputData, parentExecutionId, loadedWorkflowData, loadedRunData) {
    var _a;
    const externalHooks = _1.ExternalHooks();
    await externalHooks.init();
    const nodeTypes = _1.NodeTypes();
    const workflowData = loadedWorkflowData !== undefined ? loadedWorkflowData : await getWorkflowData(workflowInfo);
    const workflowName = workflowData ? workflowData.name : undefined;
    const workflow = new n8n_workflow_1.Workflow({ id: workflowInfo.id, name: workflowName, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData });
    const runData = loadedRunData !== undefined ? loadedRunData : await getRunData(workflowData, inputData);
    let executionId;
    if (parentExecutionId !== undefined) {
        executionId = parentExecutionId;
    }
    else {
        executionId = parentExecutionId !== undefined ? parentExecutionId : await _1.ActiveExecutions.getInstance().add(runData);
    }
    const runExecutionData = runData.executionData;
    const credentials = await _1.WorkflowCredentials(workflowData.nodes);
    const additionalDataIntegrated = await getBase(credentials);
    additionalDataIntegrated.hooks = getWorkflowHooksIntegrated(runData.executionMode, executionId, workflowData, { parentProcessMode: additionalData.hooks.mode });
    additionalDataIntegrated.executeWorkflow = additionalData.executeWorkflow;
    let subworkflowTimeout = additionalData.executionTimeoutTimestamp;
    if (((_a = workflowData.settings) === null || _a === void 0 ? void 0 : _a.executionTimeout) !== undefined && workflowData.settings.executionTimeout > 0) {
        subworkflowTimeout = Math.min(additionalData.executionTimeoutTimestamp || Number.MAX_SAFE_INTEGER, Date.now() + (workflowData.settings.executionTimeout * 1000));
    }
    additionalDataIntegrated.executionTimeoutTimestamp = subworkflowTimeout;
    const workflowExecute = new n8n_core_1.WorkflowExecute(additionalDataIntegrated, runData.executionMode, runExecutionData);
    if (parentExecutionId !== undefined) {
        return {
            startedAt: new Date(),
            workflow,
            workflowExecute,
        };
    }
    const data = await workflowExecute.processRunExecutionData(workflow);
    await externalHooks.run('workflow.postExecute', [data, workflowData]);
    if (data.finished === true) {
        await _1.ActiveExecutions.getInstance().remove(executionId, data);
        const returnData = _1.WorkflowHelpers.getDataLastExecutedNodeData(data);
        return returnData.data.main;
    }
    else {
        await _1.ActiveExecutions.getInstance().remove(executionId, data);
        const { error } = data.data.resultData;
        throw Object.assign(Object.assign({}, error), { stack: error.stack });
    }
}
exports.executeWorkflow = executeWorkflow;
function sendMessageToUI(source, message) {
    if (this.sessionId === undefined) {
        return;
    }
    try {
        const pushInstance = _1.Push.getInstance();
        pushInstance.send('sendConsoleMessage', {
            source: `Node: "${source}"`,
            message,
        }, this.sessionId);
    }
    catch (error) {
        n8n_workflow_1.LoggerProxy.warn(`There was a problem sending messsage to UI: ${error.message}`);
    }
}
exports.sendMessageToUI = sendMessageToUI;
async function getBase(credentials, currentNodeParameters, executionTimeoutTimestamp) {
    const urlBaseWebhook = _1.WebhookHelpers.getWebhookBaseUrl();
    const timezone = config.get('generic.timezone');
    const webhookBaseUrl = urlBaseWebhook + config.get('endpoints.webhook');
    const webhookTestBaseUrl = urlBaseWebhook + config.get('endpoints.webhookTest');
    const encryptionKey = await n8n_core_1.UserSettings.getEncryptionKey();
    if (encryptionKey === undefined) {
        throw new Error('No encryption key got found to decrypt the credentials!');
    }
    return {
        credentials,
        credentialsHelper: new _1.CredentialsHelper(credentials, encryptionKey),
        encryptionKey,
        executeWorkflow,
        restApiUrl: urlBaseWebhook + config.get('endpoints.rest'),
        timezone,
        webhookBaseUrl,
        webhookTestBaseUrl,
        currentNodeParameters,
        executionTimeoutTimestamp,
    };
}
exports.getBase = getBase;
function getWorkflowHooksIntegrated(mode, executionId, workflowData, optionalParameters) {
    optionalParameters = optionalParameters || {};
    const hookFunctions = hookFunctionsSave(optionalParameters.parentProcessMode);
    const preExecuteFunctions = hookFunctionsPreExecute(optionalParameters.parentProcessMode);
    for (const key of Object.keys(preExecuteFunctions)) {
        if (hookFunctions[key] === undefined) {
            hookFunctions[key] = [];
        }
        hookFunctions[key].push.apply(hookFunctions[key], preExecuteFunctions[key]);
    }
    return new n8n_workflow_1.WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
}
exports.getWorkflowHooksIntegrated = getWorkflowHooksIntegrated;
function getWorkflowHooksWorkerExecuter(mode, executionId, workflowData, optionalParameters) {
    optionalParameters = optionalParameters || {};
    const hookFunctions = hookFunctionsSaveWorker();
    const preExecuteFunctions = hookFunctionsPreExecute(optionalParameters.parentProcessMode);
    for (const key of Object.keys(preExecuteFunctions)) {
        if (hookFunctions[key] === undefined) {
            hookFunctions[key] = [];
        }
        hookFunctions[key].push.apply(hookFunctions[key], preExecuteFunctions[key]);
    }
    return new n8n_workflow_1.WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
}
exports.getWorkflowHooksWorkerExecuter = getWorkflowHooksWorkerExecuter;
function getWorkflowHooksWorkerMain(mode, executionId, workflowData, optionalParameters) {
    optionalParameters = optionalParameters || {};
    const hookFunctions = hookFunctionsPush();
    const preExecuteFunctions = hookFunctionsPreExecute(optionalParameters.parentProcessMode);
    for (const key of Object.keys(preExecuteFunctions)) {
        if (hookFunctions[key] === undefined) {
            hookFunctions[key] = [];
        }
        hookFunctions[key].push.apply(hookFunctions[key], preExecuteFunctions[key]);
    }
    hookFunctions.nodeExecuteBefore = [];
    hookFunctions.nodeExecuteAfter = [];
    return new n8n_workflow_1.WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
}
exports.getWorkflowHooksWorkerMain = getWorkflowHooksWorkerMain;
function getWorkflowHooksMain(data, executionId, isMainProcess = false) {
    const hookFunctions = hookFunctionsSave();
    const pushFunctions = hookFunctionsPush();
    for (const key of Object.keys(pushFunctions)) {
        if (hookFunctions[key] === undefined) {
            hookFunctions[key] = [];
        }
        hookFunctions[key].push.apply(hookFunctions[key], pushFunctions[key]);
    }
    if (isMainProcess) {
        const preExecuteFunctions = hookFunctionsPreExecute();
        for (const key of Object.keys(preExecuteFunctions)) {
            if (hookFunctions[key] === undefined) {
                hookFunctions[key] = [];
            }
            hookFunctions[key].push.apply(hookFunctions[key], preExecuteFunctions[key]);
        }
    }
    return new n8n_workflow_1.WorkflowHooks(hookFunctions, data.executionMode, executionId, data.workflowData, { sessionId: data.sessionId, retryOf: data.retryOf });
}
exports.getWorkflowHooksMain = getWorkflowHooksMain;
//# sourceMappingURL=WorkflowExecuteAdditionalData.js.map