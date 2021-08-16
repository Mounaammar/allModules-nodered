"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstance = exports.TestWebhooks = void 0;
const _1 = require("./");
const n8n_core_1 = require("n8n-core");
class TestWebhooks {
    constructor() {
        this.testWebhookData = {};
        this.activeWebhooks = null;
        this.activeWebhooks = new n8n_core_1.ActiveWebhooks();
        this.activeWebhooks.testWebhooks = true;
    }
    async callTestWebhook(httpMethod, path, request, response) {
        request.params = {};
        if (path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        let webhookData = this.activeWebhooks.get(httpMethod, path);
        if (webhookData === undefined) {
            const pathElements = path.split('/');
            const webhookId = pathElements.shift();
            webhookData = this.activeWebhooks.get(httpMethod, pathElements.join('/'), webhookId);
            if (webhookData === undefined) {
                throw new _1.ResponseHelper.ResponseError(`The requested webhook "${httpMethod} ${path}" is not registered.`, 404, 404);
            }
            path = webhookData.path;
            path.split('/').forEach((ele, index) => {
                if (ele.startsWith(':')) {
                    request.params[ele.slice(1)] = pathElements[index];
                }
            });
        }
        const webhookKey = this.activeWebhooks.getWebhookKey(webhookData.httpMethod, webhookData.path, webhookData.webhookId) + `|${webhookData.workflowId}`;
        if (this.testWebhookData[webhookKey] === undefined) {
            throw new _1.ResponseHelper.ResponseError(`The requested webhook "${httpMethod} ${path}" is not registered.`, 404, 404);
        }
        const workflow = this.testWebhookData[webhookKey].workflow;
        const workflowStartNode = workflow.getNode(webhookData.node);
        if (workflowStartNode === null) {
            throw new _1.ResponseHelper.ResponseError('Could not find node to process webhook.', 404, 404);
        }
        return new Promise(async (resolve, reject) => {
            try {
                const executionMode = 'manual';
                const executionId = await _1.WebhookHelpers.executeWebhook(workflow, webhookData, this.testWebhookData[webhookKey].workflowData, workflowStartNode, executionMode, this.testWebhookData[webhookKey].sessionId, request, response, (error, data) => {
                    if (error !== null) {
                        return reject(error);
                    }
                    resolve(data);
                });
                if (executionId === undefined) {
                    return;
                }
                if (this.testWebhookData[webhookKey].sessionId !== undefined) {
                    const pushInstance = _1.Push.getInstance();
                    pushInstance.send('testWebhookReceived', { workflowId: webhookData.workflowId, executionId }, this.testWebhookData[webhookKey].sessionId);
                }
            }
            catch (error) {
            }
            clearTimeout(this.testWebhookData[webhookKey].timeout);
            delete this.testWebhookData[webhookKey];
            this.activeWebhooks.removeWorkflow(workflow);
        });
    }
    async getWebhookMethods(path) {
        const webhookMethods = this.activeWebhooks.getWebhookMethods(path);
        if (webhookMethods === undefined) {
            throw new _1.ResponseHelper.ResponseError(`The requested webhook "${path}" is not registered.`, 404, 404);
        }
        return webhookMethods;
    }
    async needsWebhookData(workflowData, workflow, additionalData, mode, activation, sessionId, destinationNode) {
        const webhooks = _1.WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, destinationNode);
        if (webhooks.length === 0) {
            return false;
        }
        if (workflow.id === undefined) {
            throw new Error('Webhooks can only be added for saved workflows as an id is needed!');
        }
        const timeout = setTimeout(() => {
            this.cancelTestWebhook(workflowData.id.toString());
        }, 120000);
        let key;
        const activatedKey = [];
        for (const webhookData of webhooks) {
            key = this.activeWebhooks.getWebhookKey(webhookData.httpMethod, webhookData.path, webhookData.webhookId) + `|${workflowData.id}`;
            activatedKey.push(key);
            this.testWebhookData[key] = {
                sessionId,
                timeout,
                workflow,
                workflowData,
            };
            try {
                await this.activeWebhooks.add(workflow, webhookData, mode, activation);
            }
            catch (error) {
                activatedKey.forEach(deleteKey => delete this.testWebhookData[deleteKey]);
                await this.activeWebhooks.removeWorkflow(workflow);
                throw error;
            }
        }
        return true;
    }
    cancelTestWebhook(workflowId) {
        let foundWebhook = false;
        for (const webhookKey of Object.keys(this.testWebhookData)) {
            const webhookData = this.testWebhookData[webhookKey];
            if (webhookData.workflowData.id.toString() !== workflowId) {
                continue;
            }
            clearTimeout(this.testWebhookData[webhookKey].timeout);
            if (this.testWebhookData[webhookKey].sessionId !== undefined) {
                try {
                    const pushInstance = _1.Push.getInstance();
                    pushInstance.send('testWebhookDeleted', { workflowId }, this.testWebhookData[webhookKey].sessionId);
                }
                catch (error) {
                }
            }
            const workflow = this.testWebhookData[webhookKey].workflow;
            delete this.testWebhookData[webhookKey];
            if (foundWebhook === false) {
                this.activeWebhooks.removeWorkflow(workflow);
            }
            foundWebhook = true;
        }
        return foundWebhook;
    }
    async removeAll() {
        if (this.activeWebhooks === null) {
            return;
        }
        let workflow;
        const workflows = [];
        for (const webhookKey of Object.keys(this.testWebhookData)) {
            workflow = this.testWebhookData[webhookKey].workflow;
            workflows.push(workflow);
        }
        return this.activeWebhooks.removeAll(workflows);
    }
}
exports.TestWebhooks = TestWebhooks;
let testWebhooksInstance;
function getInstance() {
    if (testWebhooksInstance === undefined) {
        testWebhooksInstance = new TestWebhooks();
    }
    return testWebhooksInstance;
}
exports.getInstance = getInstance;
//# sourceMappingURL=TestWebhooks.js.map