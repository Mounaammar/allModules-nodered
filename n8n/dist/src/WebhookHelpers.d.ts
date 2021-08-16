import * as express from 'express';
import { IResponseCallbackData, IWorkflowDb } from './';
import { INode, IWebhookData, IWorkflowExecuteAdditionalData, Workflow, WorkflowExecuteMode } from 'n8n-workflow';
export declare function getWorkflowWebhooks(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData, destinationNode?: string): IWebhookData[];
export declare function getWorkflowWebhooksBasic(workflow: Workflow): IWebhookData[];
export declare function executeWebhook(workflow: Workflow, webhookData: IWebhookData, workflowData: IWorkflowDb, workflowStartNode: INode, executionMode: WorkflowExecuteMode, sessionId: string | undefined, req: express.Request, res: express.Response, responseCallback: (error: Error | null, data: IResponseCallbackData) => void): Promise<string | undefined>;
export declare function getWebhookBaseUrl(): string;
