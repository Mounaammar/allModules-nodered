"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebhookBaseUrl = exports.executeWebhook = exports.getWorkflowWebhooksBasic = exports.getWorkflowWebhooks = void 0;
const lodash_1 = require("lodash");
const _1 = require("./");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const activeExecutions = _1.ActiveExecutions.getInstance();
function getWorkflowWebhooks(workflow, additionalData, destinationNode) {
    const returnData = [];
    let parentNodes;
    if (destinationNode !== undefined) {
        parentNodes = workflow.getParentNodes(destinationNode);
        parentNodes.push(destinationNode);
    }
    for (const node of Object.values(workflow.nodes)) {
        if (parentNodes !== undefined && !parentNodes.includes(node.name)) {
            continue;
        }
        returnData.push.apply(returnData, n8n_workflow_1.NodeHelpers.getNodeWebhooks(workflow, node, additionalData));
    }
    return returnData;
}
exports.getWorkflowWebhooks = getWorkflowWebhooks;
function getWorkflowWebhooksBasic(workflow) {
    const returnData = [];
    for (const node of Object.values(workflow.nodes)) {
        returnData.push.apply(returnData, n8n_workflow_1.NodeHelpers.getNodeWebhooksBasic(workflow, node));
    }
    return returnData;
}
exports.getWorkflowWebhooksBasic = getWorkflowWebhooksBasic;
async function executeWebhook(workflow, webhookData, workflowData, workflowStartNode, executionMode, sessionId, req, res, responseCallback) {
    const nodeType = workflow.nodeTypes.getByName(workflowStartNode.type);
    if (nodeType === undefined) {
        const errorMessage = `The type of the webhook node "${workflowStartNode.name}" is not known.`;
        responseCallback(new Error(errorMessage), {});
        throw new _1.ResponseHelper.ResponseError(errorMessage, 500, 500);
    }
    const responseMode = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseMode'], executionMode, 'onReceived');
    const responseCode = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseCode'], executionMode, 200);
    if (!['onReceived', 'lastNode'].includes(responseMode)) {
        const errorMessage = `The response mode ${responseMode} is not valid!`;
        responseCallback(new Error(errorMessage), {});
        throw new _1.ResponseHelper.ResponseError(errorMessage, 500, 500);
    }
    const credentials = await _1.WorkflowCredentials(workflowData.nodes);
    const additionalData = await _1.WorkflowExecuteAdditionalData.getBase(credentials);
    additionalData.httpRequest = req;
    additionalData.httpResponse = res;
    let didSendResponse = false;
    let runExecutionDataMerge = {};
    try {
        let webhookResultData;
        try {
            webhookResultData = await workflow.runWebhook(webhookData, workflowStartNode, additionalData, n8n_core_1.NodeExecuteFunctions, executionMode);
        }
        catch (err) {
            const errorMessage = 'Workflow Webhook Error: Workflow could not be started!';
            responseCallback(new Error(errorMessage), {});
            didSendResponse = true;
            runExecutionDataMerge = {
                resultData: {
                    runData: {},
                    lastNodeExecuted: workflowStartNode.name,
                    error: Object.assign(Object.assign({}, err), { message: err.message, stack: err.stack }),
                },
            };
            webhookResultData = {
                noWebhookResponse: true,
                workflowData: [[{ json: {} }]],
            };
        }
        await _1.WorkflowHelpers.saveStaticData(workflow);
        if (webhookData.webhookDescription['responseHeaders'] !== undefined) {
            const responseHeaders = workflow.expression.getComplexParameterValue(workflowStartNode, webhookData.webhookDescription['responseHeaders'], executionMode, undefined);
            if (responseHeaders !== undefined && responseHeaders['entries'] !== undefined) {
                for (const item of responseHeaders['entries']) {
                    res.setHeader(item['name'], item['value']);
                }
            }
        }
        if (webhookResultData.noWebhookResponse === true && didSendResponse === false) {
            responseCallback(null, {
                noWebhookResponse: true,
            });
            didSendResponse = true;
        }
        if (webhookResultData.workflowData === undefined) {
            if (webhookResultData.webhookResponse !== undefined) {
                if (didSendResponse === false) {
                    responseCallback(null, {
                        data: webhookResultData.webhookResponse,
                        responseCode,
                    });
                    didSendResponse = true;
                }
            }
            else {
                if (didSendResponse === false) {
                    responseCallback(null, {
                        data: {
                            message: 'Webhook call got received.',
                        },
                        responseCode,
                    });
                    didSendResponse = true;
                }
            }
            return;
        }
        if (responseMode === 'onReceived' && didSendResponse === false) {
            if (webhookResultData.webhookResponse !== undefined) {
                responseCallback(null, {
                    data: webhookResultData.webhookResponse,
                    responseCode,
                });
            }
            else {
                responseCallback(null, {
                    data: {
                        message: 'Workflow got started.',
                    },
                    responseCode,
                });
            }
            didSendResponse = true;
        }
        const nodeExecutionStack = [];
        nodeExecutionStack.push({
            node: workflowStartNode,
            data: {
                main: webhookResultData.workflowData,
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
        if (Object.keys(runExecutionDataMerge).length !== 0) {
            Object.assign(runExecutionData, runExecutionDataMerge);
        }
        const runData = {
            credentials,
            executionMode,
            executionData: runExecutionData,
            sessionId,
            workflowData,
        };
        const workflowRunner = new _1.WorkflowRunner();
        const executionId = await workflowRunner.run(runData, true, !didSendResponse);
        n8n_workflow_1.LoggerProxy.verbose(`Started execution of workflow "${workflow.name}" from webhook with execution ID ${executionId}`, { executionId });
        const executePromise = activeExecutions.getPostExecutePromise(executionId);
        executePromise.then((data) => {
            if (data === undefined) {
                if (didSendResponse === false) {
                    responseCallback(null, {
                        data: {
                            message: 'Workflow did execute sucessfully but no data got returned.',
                        },
                        responseCode,
                    });
                    didSendResponse = true;
                }
                return undefined;
            }
            const returnData = _1.WorkflowHelpers.getDataLastExecutedNodeData(data);
            if (data.data.resultData.error || (returnData === null || returnData === void 0 ? void 0 : returnData.error) !== undefined) {
                if (didSendResponse === false) {
                    responseCallback(null, {
                        data: {
                            message: 'Workflow did error.',
                        },
                        responseCode: 500,
                    });
                }
                didSendResponse = true;
                return data;
            }
            if (returnData === undefined) {
                if (didSendResponse === false) {
                    responseCallback(null, {
                        data: {
                            message: 'Workflow did execute sucessfully but the last node did not return any data.',
                        },
                        responseCode,
                    });
                }
                didSendResponse = true;
                return data;
            }
            const responseData = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseData'], executionMode, 'firstEntryJson');
            if (didSendResponse === false) {
                let data;
                if (responseData === 'firstEntryJson') {
                    if (returnData.data.main[0][0] === undefined) {
                        responseCallback(new Error('No item to return got found.'), {});
                        didSendResponse = true;
                    }
                    data = returnData.data.main[0][0].json;
                    const responsePropertyName = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responsePropertyName'], executionMode, undefined);
                    if (responsePropertyName !== undefined) {
                        data = lodash_1.get(data, responsePropertyName);
                    }
                    const responseContentType = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseContentType'], executionMode, undefined);
                    if (responseContentType !== undefined) {
                        res.setHeader('Content-Type', responseContentType);
                        if (data !== null && data !== undefined && ['Buffer', 'String'].includes(data.constructor.name)) {
                            res.end(data);
                        }
                        else {
                            res.end(JSON.stringify(data));
                        }
                        responseCallback(null, {
                            noWebhookResponse: true,
                        });
                        didSendResponse = true;
                    }
                }
                else if (responseData === 'firstEntryBinary') {
                    data = returnData.data.main[0][0];
                    if (data === undefined) {
                        responseCallback(new Error('No item to return got found.'), {});
                        didSendResponse = true;
                    }
                    if (data.binary === undefined) {
                        responseCallback(new Error('No binary data to return got found.'), {});
                        didSendResponse = true;
                    }
                    const responseBinaryPropertyName = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseBinaryPropertyName'], executionMode, 'data');
                    if (responseBinaryPropertyName === undefined && didSendResponse === false) {
                        responseCallback(new Error('No "responseBinaryPropertyName" is set.'), {});
                        didSendResponse = true;
                    }
                    const binaryData = data.binary[responseBinaryPropertyName];
                    if (binaryData === undefined && didSendResponse === false) {
                        responseCallback(new Error(`The binary property "${responseBinaryPropertyName}" which should be returned does not exist.`), {});
                        didSendResponse = true;
                    }
                    if (didSendResponse === false) {
                        res.setHeader('Content-Type', binaryData.mimeType);
                        res.end(Buffer.from(binaryData.data, n8n_core_1.BINARY_ENCODING));
                        responseCallback(null, {
                            noWebhookResponse: true,
                        });
                    }
                }
                else {
                    data = [];
                    for (const entry of returnData.data.main[0]) {
                        data.push(entry.json);
                    }
                }
                if (didSendResponse === false) {
                    responseCallback(null, {
                        data,
                        responseCode,
                    });
                }
            }
            didSendResponse = true;
            return data;
        })
            .catch((e) => {
            if (didSendResponse === false) {
                responseCallback(new Error('There was a problem executing the workflow.'), {});
            }
            throw new _1.ResponseHelper.ResponseError(e.message, 500, 500);
        });
        return executionId;
    }
    catch (e) {
        if (didSendResponse === false) {
            responseCallback(new Error('There was a problem executing the workflow.'), {});
        }
        throw new _1.ResponseHelper.ResponseError(e.message, 500, 500);
    }
}
exports.executeWebhook = executeWebhook;
function getWebhookBaseUrl() {
    let urlBaseWebhook = _1.GenericHelpers.getBaseUrl();
    if (process.env.WEBHOOK_TUNNEL_URL !== undefined || process.env.WEBHOOK_URL !== undefined) {
        urlBaseWebhook = process.env.WEBHOOK_TUNNEL_URL || process.env.WEBHOOK_URL;
    }
    return urlBaseWebhook;
}
exports.getWebhookBaseUrl = getWebhookBaseUrl;
//# sourceMappingURL=WebhookHelpers.js.map