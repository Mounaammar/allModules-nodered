"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwDuplicateEntryError = exports.validateWorkflow = exports.getStaticDataById = exports.saveStaticDataById = exports.saveStaticData = exports.getNeededNodeTypes = exports.getCredentialsData = exports.getCredentialsDataWithParents = exports.getNodeTypeData = exports.getAllNodeTypeData = exports.executeErrorWorkflow = exports.isWorkflowIdValid = exports.getDataLastExecutedNodeData = void 0;
const _1 = require("./");
const n8n_workflow_1 = require("n8n-workflow");
const config = require("../config");
const class_validator_1 = require("class-validator");
const ERROR_TRIGGER_TYPE = config.get('nodes.errorTriggerType');
function getDataLastExecutedNodeData(inputData) {
    const runData = inputData.data.resultData.runData;
    const lastNodeExecuted = inputData.data.resultData.lastNodeExecuted;
    if (lastNodeExecuted === undefined) {
        return undefined;
    }
    if (runData[lastNodeExecuted] === undefined) {
        return undefined;
    }
    return runData[lastNodeExecuted][runData[lastNodeExecuted].length - 1];
}
exports.getDataLastExecutedNodeData = getDataLastExecutedNodeData;
function isWorkflowIdValid(id) {
    if (typeof id === 'string') {
        id = parseInt(id, 10);
    }
    if (isNaN(id)) {
        return false;
    }
    return true;
}
exports.isWorkflowIdValid = isWorkflowIdValid;
async function executeErrorWorkflow(workflowId, workflowErrorData) {
    try {
        const workflowData = await _1.Db.collections.Workflow.findOne({ id: Number(workflowId) });
        if (workflowData === undefined) {
            n8n_workflow_1.LoggerProxy.error(`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find error workflow "${workflowId}"`, { workflowId });
            return;
        }
        const executionMode = 'error';
        const nodeTypes = _1.NodeTypes();
        const workflowInstance = new n8n_workflow_1.Workflow({ id: workflowId, name: workflowData.name, nodeTypes, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, staticData: workflowData.staticData, settings: workflowData.settings });
        let node;
        let workflowStartNode;
        for (const nodeName of Object.keys(workflowInstance.nodes)) {
            node = workflowInstance.nodes[nodeName];
            if (node.type === ERROR_TRIGGER_TYPE) {
                workflowStartNode = node;
            }
        }
        if (workflowStartNode === undefined) {
            n8n_workflow_1.LoggerProxy.error(`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find "${ERROR_TRIGGER_TYPE}" in workflow "${workflowId}"`);
            return;
        }
        const nodeExecutionStack = [];
        nodeExecutionStack.push({
            node: workflowStartNode,
            data: {
                main: [
                    [
                        {
                            json: workflowErrorData,
                        },
                    ],
                ],
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
            executionMode,
            executionData: runExecutionData,
            workflowData,
        };
        const workflowRunner = new _1.WorkflowRunner();
        await workflowRunner.run(runData);
    }
    catch (error) {
        n8n_workflow_1.LoggerProxy.error(`Calling Error Workflow for "${workflowErrorData.workflow.id}": "${error.message}"`, { workflowId: workflowErrorData.workflow.id });
    }
}
exports.executeErrorWorkflow = executeErrorWorkflow;
function getAllNodeTypeData() {
    const nodeTypes = _1.NodeTypes();
    const returnData = {};
    for (const nodeTypeName of Object.keys(nodeTypes.nodeTypes)) {
        if (nodeTypes.nodeTypes[nodeTypeName] === undefined) {
            throw new Error(`The NodeType "${nodeTypeName}" could not be found!`);
        }
        returnData[nodeTypeName] = {
            className: nodeTypes.nodeTypes[nodeTypeName].type.constructor.name,
            sourcePath: nodeTypes.nodeTypes[nodeTypeName].sourcePath,
        };
    }
    return returnData;
}
exports.getAllNodeTypeData = getAllNodeTypeData;
function getNodeTypeData(nodes) {
    const nodeTypes = _1.NodeTypes();
    const neededNodeTypes = getNeededNodeTypes(nodes);
    const returnData = {};
    for (const nodeTypeName of neededNodeTypes) {
        if (nodeTypes.nodeTypes[nodeTypeName] === undefined) {
            throw new Error(`The NodeType "${nodeTypeName}" could not be found!`);
        }
        returnData[nodeTypeName] = {
            className: nodeTypes.nodeTypes[nodeTypeName].type.constructor.name,
            sourcePath: nodeTypes.nodeTypes[nodeTypeName].sourcePath,
        };
    }
    return returnData;
}
exports.getNodeTypeData = getNodeTypeData;
function getCredentialsDataWithParents(type) {
    const credentialTypes = _1.CredentialTypes();
    const credentialType = credentialTypes.getByName(type);
    const credentialTypeData = {};
    credentialTypeData[type] = credentialType;
    if (credentialType === undefined || credentialType.extends === undefined) {
        return credentialTypeData;
    }
    for (const typeName of credentialType.extends) {
        if (credentialTypeData[typeName] !== undefined) {
            continue;
        }
        credentialTypeData[typeName] = credentialTypes.getByName(typeName);
        Object.assign(credentialTypeData, getCredentialsDataWithParents(typeName));
    }
    return credentialTypeData;
}
exports.getCredentialsDataWithParents = getCredentialsDataWithParents;
function getCredentialsData(credentials) {
    const credentialTypeData = {};
    for (const credentialType of Object.keys(credentials)) {
        if (credentialTypeData[credentialType] !== undefined) {
            continue;
        }
        Object.assign(credentialTypeData, getCredentialsDataWithParents(credentialType));
    }
    return credentialTypeData;
}
exports.getCredentialsData = getCredentialsData;
function getNeededNodeTypes(nodes) {
    const neededNodeTypes = [];
    for (const node of nodes) {
        if (!neededNodeTypes.includes(node.type)) {
            neededNodeTypes.push(node.type);
        }
    }
    return neededNodeTypes;
}
exports.getNeededNodeTypes = getNeededNodeTypes;
async function saveStaticData(workflow) {
    if (workflow.staticData.__dataChanged === true) {
        if (isWorkflowIdValid(workflow.id) === true) {
            try {
                await saveStaticDataById(workflow.id, workflow.staticData);
                workflow.staticData.__dataChanged = false;
            }
            catch (e) {
                n8n_workflow_1.LoggerProxy.error(`There was a problem saving the workflow with id "${workflow.id}" to save changed staticData: "${e.message}"`, { workflowId: workflow.id });
            }
        }
    }
}
exports.saveStaticData = saveStaticData;
async function saveStaticDataById(workflowId, newStaticData) {
    await _1.Db.collections.Workflow
        .update(workflowId, {
        staticData: newStaticData,
    });
}
exports.saveStaticDataById = saveStaticDataById;
async function getStaticDataById(workflowId) {
    const workflowData = await _1.Db.collections.Workflow
        .findOne(workflowId, { select: ['staticData'] });
    if (workflowData === undefined) {
        return {};
    }
    return workflowData.staticData || {};
}
exports.getStaticDataById = getStaticDataById;
async function validateWorkflow(newWorkflow) {
    const errors = await class_validator_1.validate(newWorkflow);
    if (errors.length) {
        const validationErrorMessage = Object.values(errors[0].constraints)[0];
        throw new _1.ResponseHelper.ResponseError(validationErrorMessage, undefined, 400);
    }
}
exports.validateWorkflow = validateWorkflow;
function throwDuplicateEntryError(error) {
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
        throw new _1.ResponseHelper.ResponseError('There is already a workflow with this name', undefined, 400);
    }
    throw new _1.ResponseHelper.ResponseError(errorMessage, undefined, 400);
}
exports.throwDuplicateEntryError = throwDuplicateEntryError;
//# sourceMappingURL=WorkflowHelpers.js.map