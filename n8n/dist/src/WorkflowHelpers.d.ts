/// <reference types="express-serve-static-core" />
import { ICredentialsTypeData, ITransferNodeTypes, IWorkflowErrorData } from './';
import { IDataObject, INode, IRun, ITaskData, IWorkflowCredentials, Workflow } from 'n8n-workflow';
import { WorkflowEntity } from './databases/entities/WorkflowEntity';
export declare function getDataLastExecutedNodeData(inputData: IRun): ITaskData | undefined;
export declare function isWorkflowIdValid(id: string | null | undefined | number): boolean;
export declare function executeErrorWorkflow(workflowId: string, workflowErrorData: IWorkflowErrorData): Promise<void>;
export declare function getAllNodeTypeData(): ITransferNodeTypes;
export declare function getNodeTypeData(nodes: INode[]): ITransferNodeTypes;
export declare function getCredentialsDataWithParents(type: string): ICredentialsTypeData;
export declare function getCredentialsData(credentials: IWorkflowCredentials): ICredentialsTypeData;
export declare function getNeededNodeTypes(nodes: INode[]): string[];
export declare function saveStaticData(workflow: Workflow): Promise<void>;
export declare function saveStaticDataById(workflowId: string | number, newStaticData: IDataObject): Promise<void>;
export declare function getStaticDataById(workflowId: string | number): Promise<IDataObject>;
export declare function validateWorkflow(newWorkflow: WorkflowEntity): Promise<void>;
export declare function throwDuplicateEntryError(error: Error): void;
export declare type WorkflowNameRequest = Express.Request & {
    query: {
        name?: string;
        offset?: string;
    };
};
