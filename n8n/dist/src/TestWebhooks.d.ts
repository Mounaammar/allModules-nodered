import * as express from 'express';
import { IResponseCallbackData, IWorkflowDb } from './';
import { IWorkflowExecuteAdditionalData, WebhookHttpMethod, Workflow, WorkflowActivateMode, WorkflowExecuteMode } from 'n8n-workflow';
export declare class TestWebhooks {
    private testWebhookData;
    private activeWebhooks;
    constructor();
    callTestWebhook(httpMethod: WebhookHttpMethod, path: string, request: express.Request, response: express.Response): Promise<IResponseCallbackData>;
    getWebhookMethods(path: string): Promise<string[]>;
    needsWebhookData(workflowData: IWorkflowDb, workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, activation: WorkflowActivateMode, sessionId?: string, destinationNode?: string): Promise<boolean>;
    cancelTestWebhook(workflowId: string): boolean;
    removeAll(): Promise<void>;
}
export declare function getInstance(): TestWebhooks;
