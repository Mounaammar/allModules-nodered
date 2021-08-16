"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstance = exports.ActiveExecutions = void 0;
const n8n_core_1 = require("n8n-core");
const _1 = require(".");
class ActiveExecutions {
    constructor() {
        this.activeExecutions = {};
    }
    async add(executionData, process) {
        const fullExecutionData = {
            data: executionData.executionData,
            mode: executionData.executionMode,
            finished: false,
            startedAt: new Date(),
            workflowData: executionData.workflowData,
        };
        if (executionData.retryOf !== undefined) {
            fullExecutionData.retryOf = executionData.retryOf.toString();
        }
        if (executionData.workflowData.id !== undefined && _1.WorkflowHelpers.isWorkflowIdValid(executionData.workflowData.id.toString()) === true) {
            fullExecutionData.workflowId = executionData.workflowData.id.toString();
        }
        const execution = _1.ResponseHelper.flattenExecutionData(fullExecutionData);
        const executionResult = await _1.Db.collections.Execution.save(execution);
        const executionId = typeof executionResult.id === "object" ? executionResult.id.toString() : executionResult.id + "";
        this.activeExecutions[executionId] = {
            executionData,
            process,
            startedAt: new Date(),
            postExecutePromises: [],
        };
        return executionId;
    }
    attachWorkflowExecution(executionId, workflowExecution) {
        if (this.activeExecutions[executionId] === undefined) {
            throw new Error(`No active execution with id "${executionId}" got found to attach to workflowExecution to!`);
        }
        this.activeExecutions[executionId].workflowExecution = workflowExecution;
    }
    remove(executionId, fullRunData) {
        if (this.activeExecutions[executionId] === undefined) {
            return;
        }
        for (const promise of this.activeExecutions[executionId].postExecutePromises) {
            promise.resolve(fullRunData);
        }
        delete this.activeExecutions[executionId];
    }
    async stopExecution(executionId, timeout) {
        if (this.activeExecutions[executionId] === undefined) {
            return;
        }
        if (this.activeExecutions[executionId].process !== undefined) {
            if (this.activeExecutions[executionId].process.connected) {
                setTimeout(() => {
                    this.activeExecutions[executionId].process.send({
                        type: timeout ? timeout : 'stopExecution',
                    });
                }, 1);
            }
        }
        else {
            this.activeExecutions[executionId].workflowExecution.cancel();
        }
        return this.getPostExecutePromise(executionId);
    }
    async getPostExecutePromise(executionId) {
        const waitPromise = await n8n_core_1.createDeferredPromise();
        if (this.activeExecutions[executionId] === undefined) {
            throw new Error(`There is no active execution with id "${executionId}".`);
        }
        this.activeExecutions[executionId].postExecutePromises.push(waitPromise);
        return waitPromise.promise();
    }
    getActiveExecutions() {
        const returnData = [];
        let data;
        for (const id of Object.keys(this.activeExecutions)) {
            data = this.activeExecutions[id];
            returnData.push({
                id,
                retryOf: data.executionData.retryOf,
                startedAt: data.startedAt,
                mode: data.executionData.executionMode,
                workflowId: data.executionData.workflowData.id,
            });
        }
        return returnData;
    }
}
exports.ActiveExecutions = ActiveExecutions;
let activeExecutionsInstance;
function getInstance() {
    if (activeExecutionsInstance === undefined) {
        activeExecutionsInstance = new ActiveExecutions();
    }
    return activeExecutionsInstance;
}
exports.getInstance = getInstance;
//# sourceMappingURL=ActiveExecutions.js.map