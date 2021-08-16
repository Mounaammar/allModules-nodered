"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstance = exports.ActiveWorkflowRunner = void 0;
const _1 = require("./");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const n8n_workflow_2 = require("n8n-workflow");
class ActiveWorkflowRunner {
    constructor() {
        this.activeWorkflows = null;
        this.activationErrors = {};
    }
    async init() {
        var _a;
        const workflowsData = await _1.Db.collections.Workflow.find({ active: true });
        await ((_a = _1.Db.collections.Webhook) === null || _a === void 0 ? void 0 : _a.clear());
        this.activeWorkflows = new n8n_core_1.ActiveWorkflows();
        if (workflowsData.length !== 0) {
            console.info(' ================================');
            console.info('   Start Active Workflows:');
            console.info(' ================================');
            for (const workflowData of workflowsData) {
                console.log(`   - ${workflowData.name}`);
                n8n_workflow_2.LoggerProxy.debug(`Initializing active workflow "${workflowData.name}" (startup)`, { workflowName: workflowData.name, workflowId: workflowData.id });
                try {
                    await this.add(workflowData.id.toString(), 'init', workflowData);
                    n8n_workflow_2.LoggerProxy.verbose(`Successfully started workflow "${workflowData.name}"`, { workflowName: workflowData.name, workflowId: workflowData.id });
                    console.log(`     => Started`);
                }
                catch (error) {
                    console.log(`     => ERROR: Workflow could not be activated:`);
                    console.log(`               ${error.message}`);
                    n8n_workflow_2.LoggerProxy.error(`Unable to initialize workflow "${workflowData.name}" (startup)`, { workflowName: workflowData.name, workflowId: workflowData.id });
                }
            }
            n8n_workflow_2.LoggerProxy.verbose('Finished initializing active workflows (startup)');
        }
    }
    async initWebhooks() {
        this.activeWorkflows = new n8n_core_1.ActiveWorkflows();
    }
    async removeAll() {
        const activeWorkflowId = [];
        n8n_workflow_2.LoggerProxy.verbose('Call to remove all active workflows received (removeAll)');
        if (this.activeWorkflows !== null) {
            activeWorkflowId.push.apply(activeWorkflowId, this.activeWorkflows.allActiveWorkflows());
        }
        const activeWorkflows = await this.getActiveWorkflows();
        activeWorkflowId.push.apply(activeWorkflowId, activeWorkflows.map(workflow => workflow.id));
        const removePromises = [];
        for (const workflowId of activeWorkflowId) {
            removePromises.push(this.remove(workflowId));
        }
        await Promise.all(removePromises);
        return;
    }
    async executeWebhook(httpMethod, path, req, res) {
        var _a, _b;
        n8n_workflow_2.LoggerProxy.debug(`Received webhoook "${httpMethod}" for path "${path}"`);
        if (this.activeWorkflows === null) {
            throw new _1.ResponseHelper.ResponseError('The "activeWorkflows" instance did not get initialized yet.', 404, 404);
        }
        req.params = {};
        if (path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        let webhook = await ((_a = _1.Db.collections.Webhook) === null || _a === void 0 ? void 0 : _a.findOne({ webhookPath: path, method: httpMethod }));
        let webhookId;
        if (webhook === undefined) {
            const pathElements = path.split('/');
            webhookId = pathElements.shift();
            const dynamicWebhooks = await ((_b = _1.Db.collections.Webhook) === null || _b === void 0 ? void 0 : _b.find({ webhookId, method: httpMethod, pathLength: pathElements.length }));
            if (dynamicWebhooks === undefined || dynamicWebhooks.length === 0) {
                throw new _1.ResponseHelper.ResponseError(`The requested webhook "${httpMethod} ${path}" is not registered.`, 404, 404);
            }
            let maxMatches = 0;
            const pathElementsSet = new Set(pathElements);
            dynamicWebhooks.forEach(dynamicWebhook => {
                const staticElements = dynamicWebhook.webhookPath.split('/').filter(ele => !ele.startsWith(':'));
                const allStaticExist = staticElements.every(staticEle => pathElementsSet.has(staticEle));
                if (allStaticExist && staticElements.length > maxMatches) {
                    maxMatches = staticElements.length;
                    webhook = dynamicWebhook;
                }
                else if (staticElements.length === 0 && !webhook) {
                    webhook = dynamicWebhook;
                }
            });
            if (webhook === undefined) {
                throw new _1.ResponseHelper.ResponseError(`The requested webhook "${httpMethod} ${path}" is not registered.`, 404, 404);
            }
            path = webhook.webhookPath;
            webhook.webhookPath.split('/').forEach((ele, index) => {
                if (ele.startsWith(':')) {
                    req.params[ele.slice(1)] = pathElements[index];
                }
            });
        }
        const workflowData = await _1.Db.collections.Workflow.findOne(webhook.workflowId);
        if (workflowData === undefined) {
            throw new _1.ResponseHelper.ResponseError(`Could not find workflow with id "${webhook.workflowId}"`, 404, 404);
        }
        const nodeTypes = _1.NodeTypes();
        const workflow = new n8n_workflow_1.Workflow({ id: webhook.workflowId.toString(), name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings });
        const credentials = await _1.WorkflowCredentials([workflow.getNode(webhook.node)]);
        const additionalData = await _1.WorkflowExecuteAdditionalData.getBase(credentials);
        const webhookData = n8n_workflow_1.NodeHelpers.getNodeWebhooks(workflow, workflow.getNode(webhook.node), additionalData).filter((webhook) => {
            return (webhook.httpMethod === httpMethod && webhook.path === path);
        })[0];
        const workflowStartNode = workflow.getNode(webhookData.node);
        if (workflowStartNode === null) {
            throw new _1.ResponseHelper.ResponseError('Could not find node to process webhook.', 404, 404);
        }
        return new Promise((resolve, reject) => {
            const executionMode = 'webhook';
            _1.WebhookHelpers.executeWebhook(workflow, webhookData, workflowData, workflowStartNode, executionMode, undefined, req, res, (error, data) => {
                if (error !== null) {
                    return reject(error);
                }
                resolve(data);
            });
        });
    }
    async getWebhookMethods(path) {
        var _a;
        const webhooks = await ((_a = _1.Db.collections.Webhook) === null || _a === void 0 ? void 0 : _a.find({ webhookPath: path }));
        const webhookMethods = webhooks.map(webhook => webhook.method);
        return webhookMethods;
    }
    async getActiveWorkflows() {
        var _a;
        const activeWorkflows = await ((_a = _1.Db.collections.Workflow) === null || _a === void 0 ? void 0 : _a.find({ where: { active: true }, select: ['id'] }));
        return activeWorkflows.filter(workflow => this.activationErrors[workflow.id.toString()] === undefined);
    }
    async isActive(id) {
        var _a;
        const workflow = await ((_a = _1.Db.collections.Workflow) === null || _a === void 0 ? void 0 : _a.findOne({ id: Number(id) }));
        return workflow === null || workflow === void 0 ? void 0 : workflow.active;
    }
    getActivationError(id) {
        if (this.activationErrors[id] === undefined) {
            return undefined;
        }
        return this.activationErrors[id];
    }
    async addWorkflowWebhooks(workflow, additionalData, mode, activation) {
        var _a;
        const webhooks = _1.WebhookHelpers.getWorkflowWebhooks(workflow, additionalData);
        let path = '';
        for (const webhookData of webhooks) {
            const node = workflow.getNode(webhookData.node);
            node.name = webhookData.node;
            path = webhookData.path;
            const webhook = {
                workflowId: webhookData.workflowId,
                webhookPath: path,
                node: node.name,
                method: webhookData.httpMethod,
            };
            if (webhook.webhookPath.startsWith('/')) {
                webhook.webhookPath = webhook.webhookPath.slice(1);
            }
            if (webhook.webhookPath.endsWith('/')) {
                webhook.webhookPath = webhook.webhookPath.slice(0, -1);
            }
            if ((path.startsWith(':') || path.includes('/:')) && node.webhookId) {
                webhook.webhookId = node.webhookId;
                webhook.pathLength = webhook.webhookPath.split('/').length;
            }
            try {
                await ((_a = _1.Db.collections.Webhook) === null || _a === void 0 ? void 0 : _a.insert(webhook));
                const webhookExists = await workflow.runWebhookMethod('checkExists', webhookData, n8n_core_1.NodeExecuteFunctions, mode, activation, false);
                if (webhookExists !== true) {
                    await workflow.runWebhookMethod('create', webhookData, n8n_core_1.NodeExecuteFunctions, mode, activation, false);
                }
            }
            catch (error) {
                try {
                    await this.removeWorkflowWebhooks(workflow.id);
                }
                catch (error) {
                    console.error(`Could not remove webhooks of workflow "${workflow.id}" because of error: "${error.message}"`);
                }
                let errorMessage = '';
                if (error.name === 'QueryFailedError') {
                    errorMessage = `The webhook path [${webhook.webhookPath}] and method [${webhook.method}] already exist.`;
                }
                else if (error.detail) {
                    errorMessage = error.detail;
                }
                else {
                    errorMessage = error.message;
                }
                throw error;
            }
        }
        await _1.WorkflowHelpers.saveStaticData(workflow);
    }
    async removeWorkflowWebhooks(workflowId) {
        var _a;
        const workflowData = await _1.Db.collections.Workflow.findOne(workflowId);
        if (workflowData === undefined) {
            throw new Error(`Could not find workflow with id "${workflowId}"`);
        }
        const nodeTypes = _1.NodeTypes();
        const workflow = new n8n_workflow_1.Workflow({ id: workflowId, name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings });
        const mode = 'internal';
        const credentials = await _1.WorkflowCredentials(workflowData.nodes);
        const additionalData = await _1.WorkflowExecuteAdditionalData.getBase(credentials);
        const webhooks = _1.WebhookHelpers.getWorkflowWebhooks(workflow, additionalData);
        for (const webhookData of webhooks) {
            await workflow.runWebhookMethod('delete', webhookData, n8n_core_1.NodeExecuteFunctions, mode, 'update', false);
        }
        await _1.WorkflowHelpers.saveStaticData(workflow);
        const webhook = {
            workflowId: workflowData.id,
        };
        await ((_a = _1.Db.collections.Webhook) === null || _a === void 0 ? void 0 : _a.delete(webhook));
    }
    runWorkflow(workflowData, node, data, additionalData, mode) {
        const nodeExecutionStack = [
            {
                node,
                data: {
                    main: data,
                },
            },
        ];
        const executionData = {
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
        const runData = {
            credentials: additionalData.credentials,
            executionMode: mode,
            executionData,
            workflowData,
        };
        const workflowRunner = new _1.WorkflowRunner();
        return workflowRunner.run(runData, true);
    }
    getExecutePollFunctions(workflowData, additionalData, mode, activation) {
        return ((workflow, node) => {
            const returnFunctions = n8n_core_1.NodeExecuteFunctions.getExecutePollFunctions(workflow, node, additionalData, mode, activation);
            returnFunctions.__emit = (data) => {
                n8n_workflow_2.LoggerProxy.debug(`Received event to trigger execution for workflow "${workflow.name}"`);
                this.runWorkflow(workflowData, node, data, additionalData, mode);
            };
            return returnFunctions;
        });
    }
    getExecuteTriggerFunctions(workflowData, additionalData, mode, activation) {
        return ((workflow, node) => {
            const returnFunctions = n8n_core_1.NodeExecuteFunctions.getExecuteTriggerFunctions(workflow, node, additionalData, mode, activation);
            returnFunctions.emit = (data) => {
                n8n_workflow_2.LoggerProxy.debug(`Received trigger for workflow "${workflow.name}"`);
                _1.WorkflowHelpers.saveStaticData(workflow);
                this.runWorkflow(workflowData, node, data, additionalData, mode).catch((err) => console.error(err));
            };
            return returnFunctions;
        });
    }
    async add(workflowId, activation, workflowData) {
        if (this.activeWorkflows === null) {
            throw new Error(`The "activeWorkflows" instance did not get initialized yet.`);
        }
        let workflowInstance;
        try {
            if (workflowData === undefined) {
                workflowData = await _1.Db.collections.Workflow.findOne(workflowId);
            }
            if (!workflowData) {
                throw new Error(`Could not find workflow with id "${workflowId}".`);
            }
            const nodeTypes = _1.NodeTypes();
            workflowInstance = new n8n_workflow_1.Workflow({ id: workflowId, name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings });
            const canBeActivated = workflowInstance.checkIfWorkflowCanBeActivated(['n8n-nodes-base.start']);
            if (canBeActivated === false) {
                n8n_workflow_2.LoggerProxy.error(`Unable to activate workflow "${workflowData.name}"`);
                throw new Error(`The workflow can not be activated because it does not contain any nodes which could start the workflow. Only workflows which have trigger or webhook nodes can be activated.`);
            }
            const mode = 'trigger';
            const credentials = await _1.WorkflowCredentials(workflowData.nodes);
            const additionalData = await _1.WorkflowExecuteAdditionalData.getBase(credentials);
            const getTriggerFunctions = this.getExecuteTriggerFunctions(workflowData, additionalData, mode, activation);
            const getPollFunctions = this.getExecutePollFunctions(workflowData, additionalData, mode, activation);
            await this.addWorkflowWebhooks(workflowInstance, additionalData, mode, activation);
            if (workflowInstance.getTriggerNodes().length !== 0
                || workflowInstance.getPollNodes().length !== 0) {
                await this.activeWorkflows.add(workflowId, workflowInstance, additionalData, mode, activation, getTriggerFunctions, getPollFunctions);
                n8n_workflow_2.LoggerProxy.verbose(`Successfully activated workflow "${workflowData.name}"`, { workflowId, workflowName: workflowData.name });
            }
            if (this.activationErrors[workflowId] !== undefined) {
                delete this.activationErrors[workflowId];
            }
        }
        catch (error) {
            this.activationErrors[workflowId] = {
                time: new Date().getTime(),
                error: {
                    message: error.message,
                },
            };
            throw error;
        }
        await _1.WorkflowHelpers.saveStaticData(workflowInstance);
    }
    async remove(workflowId) {
        if (this.activeWorkflows !== null) {
            try {
                await this.removeWorkflowWebhooks(workflowId);
            }
            catch (error) {
                console.error(`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`);
            }
            if (this.activationErrors[workflowId] !== undefined) {
                delete this.activationErrors[workflowId];
            }
            if (this.activeWorkflows.isActive(workflowId)) {
                await this.activeWorkflows.remove(workflowId);
                n8n_workflow_2.LoggerProxy.verbose(`Successfully deactivated workflow "${workflowId}"`, { workflowId });
            }
            return;
        }
        throw new Error(`The "activeWorkflows" instance did not get initialized yet.`);
    }
}
exports.ActiveWorkflowRunner = ActiveWorkflowRunner;
let workflowRunnerInstance;
function getInstance() {
    if (workflowRunnerInstance === undefined) {
        workflowRunnerInstance = new ActiveWorkflowRunner();
    }
    return workflowRunnerInstance;
}
exports.getInstance = getInstance;
//# sourceMappingURL=ActiveWorkflowRunner.js.map