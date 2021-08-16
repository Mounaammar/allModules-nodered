import { IActivationError, IResponseCallbackData, IWorkflowDb } from './';
import { IGetExecutePollFunctions, IGetExecuteTriggerFunctions, INode, INodeExecutionData, IWorkflowExecuteAdditionalData as IWorkflowExecuteAdditionalDataWorkflow, WebhookHttpMethod, Workflow, WorkflowActivateMode, WorkflowExecuteMode } from 'n8n-workflow';
import * as express from 'express';
export declare class ActiveWorkflowRunner {
    private activeWorkflows;
    private activationErrors;
    init(): Promise<void>;
    initWebhooks(): Promise<void>;
    removeAll(): Promise<void>;
    executeWebhook(httpMethod: WebhookHttpMethod, path: string, req: express.Request, res: express.Response): Promise<IResponseCallbackData>;
    getWebhookMethods(path: string): Promise<string[]>;
    getActiveWorkflows(): Promise<IWorkflowDb[]>;
    isActive(id: string): Promise<boolean>;
    getActivationError(id: string): IActivationError | undefined;
    addWorkflowWebhooks(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalDataWorkflow, mode: WorkflowExecuteMode, activation: WorkflowActivateMode): Promise<void>;
    removeWorkflowWebhooks(workflowId: string): Promise<void>;
    runWorkflow(workflowData: IWorkflowDb, node: INode, data: INodeExecutionData[][], additionalData: IWorkflowExecuteAdditionalDataWorkflow, mode: WorkflowExecuteMode): Promise<string>;
    getExecutePollFunctions(workflowData: IWorkflowDb, additionalData: IWorkflowExecuteAdditionalDataWorkflow, mode: WorkflowExecuteMode, activation: WorkflowActivateMode): IGetExecutePollFunctions;
    getExecuteTriggerFunctions(workflowData: IWorkflowDb, additionalData: IWorkflowExecuteAdditionalDataWorkflow, mode: WorkflowExecuteMode, activation: WorkflowActivateMode): IGetExecuteTriggerFunctions;
    add(workflowId: string, activation: WorkflowActivateMode, workflowData?: IWorkflowDb): Promise<void>;
    remove(workflowId: string): Promise<void>;
}
export declare function getInstance(): ActiveWorkflowRunner;
