/// <reference types="node" />
import { ExecutionError, ICredentialDataDecryptedObject, ICredentialsDecrypted, ICredentialsEncrypted, ICredentialType, IDataObject, IRun, IRunData, IRunExecutionData, ITaskData, IWorkflowBase as IWorkflowBaseWorkflow, IWorkflowCredentials, Workflow, WorkflowExecuteMode } from 'n8n-workflow';
import { IDeferredPromise, WorkflowExecute } from 'n8n-core';
import * as PCancelable from 'p-cancelable';
import { Repository } from 'typeorm';
import { ChildProcess } from 'child_process';
import { Url } from 'url';
import { Request } from 'express';
import { WorkflowEntity } from './databases/entities/WorkflowEntity';
import { TagEntity } from './databases/entities/TagEntity';
export interface IActivationError {
    time: number;
    error: {
        message: string;
    };
}
export interface IBullJobData {
    executionId: string;
    loadStaticData: boolean;
}
export interface IBullJobResponse {
    success: boolean;
}
export interface ICustomRequest extends Request {
    parsedUrl: Url | undefined;
}
export interface ICredentialsTypeData {
    [key: string]: ICredentialType;
}
export interface ICredentialsOverwrite {
    [key: string]: ICredentialDataDecryptedObject;
}
export interface IDatabaseCollections {
    Credentials: Repository<ICredentialsDb> | null;
    Execution: Repository<IExecutionFlattedDb> | null;
    Workflow: Repository<WorkflowEntity> | null;
    Webhook: Repository<IWebhookDb> | null;
    Tag: Repository<TagEntity> | null;
}
export interface IWebhookDb {
    workflowId: number | string;
    webhookPath: string;
    method: string;
    node: string;
    webhookId?: string;
    pathLength?: number;
}
export interface ITagDb {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare type UsageCount = {
    usageCount: number;
};
export declare type ITagWithCountDb = ITagDb & UsageCount;
export interface IWorkflowBase extends IWorkflowBaseWorkflow {
    id?: number | string;
}
export interface IWorkflowDb extends IWorkflowBase {
    id: number | string;
    tags: ITagDb[];
}
export interface IWorkflowResponse extends IWorkflowBase {
    id: string;
}
export interface ICredentialsBase {
    createdAt: Date;
    updatedAt: Date;
}
export interface ICredentialsDb extends ICredentialsBase, ICredentialsEncrypted {
    id: number | string;
}
export interface ICredentialsResponse extends ICredentialsDb {
    id: string;
}
export interface ICredentialsDecryptedDb extends ICredentialsBase, ICredentialsDecrypted {
    id: number | string;
}
export interface ICredentialsDecryptedResponse extends ICredentialsDecryptedDb {
    id: string;
}
export declare type DatabaseType = 'mariadb' | 'postgresdb' | 'mysqldb' | 'sqlite';
export declare type SaveExecutionDataType = 'all' | 'none';
export interface IExecutionBase {
    id?: number | string;
    mode: WorkflowExecuteMode;
    startedAt: Date;
    stoppedAt?: Date;
    workflowId?: string;
    finished: boolean;
    retryOf?: number | string;
    retrySuccessId?: number | string;
}
export interface IExecutionDb extends IExecutionBase {
    data: IRunExecutionData;
    workflowData?: IWorkflowBase;
}
export interface IExecutionPushResponse {
    executionId?: string;
    waitingForWebhook?: boolean;
}
export interface IExecutionResponse extends IExecutionBase {
    id: string;
    data: IRunExecutionData;
    retryOf?: string;
    retrySuccessId?: string;
    workflowData: IWorkflowBase;
}
export interface IExecutionFlatted extends IExecutionBase {
    data: string;
    workflowData: IWorkflowBase;
}
export interface IExecutionFlattedDb extends IExecutionBase {
    id: number | string;
    data: string;
    workflowData: IWorkflowBase;
}
export interface IExecutionFlattedResponse extends IExecutionFlatted {
    id: string;
    retryOf?: string;
}
export interface IExecutionsListResponse {
    count: number;
    results: IExecutionsSummary[];
}
export interface IExecutionsStopData {
    finished?: boolean;
    mode: WorkflowExecuteMode;
    startedAt: Date;
    stoppedAt?: Date;
}
export interface IExecutionsSummary {
    id: string;
    finished?: boolean;
    mode: WorkflowExecuteMode;
    retryOf?: string;
    retrySuccessId?: string;
    startedAt: Date;
    stoppedAt?: Date;
    workflowId: string;
    workflowName?: string;
}
export interface IExecutionsCurrentSummary {
    id: string;
    retryOf?: string;
    startedAt: Date;
    mode: WorkflowExecuteMode;
    workflowId: string;
}
export interface IExecutionDeleteFilter {
    deleteBefore?: Date;
    filters?: IDataObject;
    ids?: string[];
}
export interface IExecutingWorkflowData {
    executionData: IWorkflowExecutionDataProcess;
    process?: ChildProcess;
    startedAt: Date;
    postExecutePromises: Array<IDeferredPromise<IRun | undefined>>;
    workflowExecution?: PCancelable<IRun>;
}
export interface IExternalHooks {
    credentials?: {
        create?: Array<{
            (this: IExternalHooksFunctions, credentialsData: ICredentialsEncrypted): Promise<void>;
        }>;
        delete?: Array<{
            (this: IExternalHooksFunctions, credentialId: string): Promise<void>;
        }>;
        update?: Array<{
            (this: IExternalHooksFunctions, credentialsData: ICredentialsDb): Promise<void>;
        }>;
    };
    workflow?: {
        activate?: Array<{
            (this: IExternalHooksFunctions, workflowData: IWorkflowDb): Promise<void>;
        }>;
        create?: Array<{
            (this: IExternalHooksFunctions, workflowData: IWorkflowBase): Promise<void>;
        }>;
        delete?: Array<{
            (this: IExternalHooksFunctions, workflowId: string): Promise<void>;
        }>;
        execute?: Array<{
            (this: IExternalHooksFunctions, workflowData: IWorkflowDb, mode: WorkflowExecuteMode): Promise<void>;
        }>;
        update?: Array<{
            (this: IExternalHooksFunctions, workflowData: IWorkflowDb): Promise<void>;
        }>;
    };
}
export interface IExternalHooksFileData {
    [key: string]: {
        [key: string]: Array<(...args: any[]) => Promise<void>>;
    };
}
export interface IExternalHooksFunctions {
    dbCollections: IDatabaseCollections;
}
export interface IExternalHooksClass {
    init(): Promise<void>;
    run(hookName: string, hookParameters?: any[]): Promise<void>;
}
export interface IN8nConfig {
    database: IN8nConfigDatabase;
    endpoints: IN8nConfigEndpoints;
    executions: IN8nConfigExecutions;
    generic: IN8nConfigGeneric;
    host: string;
    nodes: IN8nConfigNodes;
    port: number;
    protocol: 'http' | 'https';
}
export interface IN8nConfigDatabase {
    type: DatabaseType;
    postgresdb: {
        host: string;
        password: string;
        port: number;
        user: string;
    };
}
export interface IN8nConfigEndpoints {
    rest: string;
    webhook: string;
    webhookTest: string;
}
export interface IN8nConfigExecutions {
    saveDataOnError: SaveExecutionDataType;
    saveDataOnSuccess: SaveExecutionDataType;
    saveDataManualExecutions: boolean;
}
export interface IN8nConfigExecutions {
    saveDataOnError: SaveExecutionDataType;
    saveDataOnSuccess: SaveExecutionDataType;
    saveDataManualExecutions: boolean;
}
export interface IN8nConfigGeneric {
    timezone: string;
}
export interface IN8nConfigNodes {
    errorTriggerType: string;
    exclude: string[];
}
export interface IN8nUISettings {
    endpointWebhook: string;
    endpointWebhookTest: string;
    saveDataErrorExecution: string;
    saveDataSuccessExecution: string;
    saveManualExecutions: boolean;
    executionTimeout: number;
    maxExecutionTimeout: number;
    oauthCallbackUrls: {
        oauth1: string;
        oauth2: string;
    };
    timezone: string;
    urlBaseWebhook: string;
    versionCli: string;
    n8nMetadata?: {
        [key: string]: string | number | undefined;
    };
}
export interface IPackageVersions {
    cli: string;
}
export declare type IPushDataType = IPushData['type'];
export declare type IPushData = PushDataExecutionFinished | PushDataExecutionStarted | PushDataExecuteAfter | PushDataExecuteBefore | PushDataConsoleMessage | PushDataTestWebhook;
declare type PushDataExecutionFinished = {
    data: IPushDataExecutionFinished;
    type: 'executionFinished';
};
declare type PushDataExecutionStarted = {
    data: IPushDataExecutionStarted;
    type: 'executionStarted';
};
declare type PushDataExecuteAfter = {
    data: IPushDataNodeExecuteAfter;
    type: 'nodeExecuteAfter';
};
declare type PushDataExecuteBefore = {
    data: IPushDataNodeExecuteBefore;
    type: 'nodeExecuteBefore';
};
declare type PushDataConsoleMessage = {
    data: IPushDataConsoleMessage;
    type: 'sendConsoleMessage';
};
declare type PushDataTestWebhook = {
    data: IPushDataTestWebhook;
    type: 'testWebhookDeleted' | 'testWebhookReceived';
};
export interface IPushDataExecutionFinished {
    data: IRun;
    executionId: string;
    retryOf?: string;
}
export interface IPushDataExecutionStarted {
    executionId: string;
    mode: WorkflowExecuteMode;
    startedAt: Date;
    retryOf?: string;
    workflowId: string;
    workflowName?: string;
}
export interface IPushDataNodeExecuteAfter {
    data: ITaskData;
    executionId: string;
    nodeName: string;
}
export interface IPushDataNodeExecuteBefore {
    executionId: string;
    nodeName: string;
}
export interface IPushDataTestWebhook {
    executionId: string;
    workflowId: string;
}
export interface IPushDataConsoleMessage {
    source: string;
    message: string;
}
export interface IResponseCallbackData {
    data?: IDataObject | IDataObject[];
    noWebhookResponse?: boolean;
    responseCode?: number;
}
export interface ITransferNodeTypes {
    [key: string]: {
        className: string;
        sourcePath: string;
    };
}
export interface IWorkflowErrorData {
    [key: string]: IDataObject | string | number | ExecutionError;
    execution: {
        id?: string;
        error: ExecutionError;
        lastNodeExecuted: string;
        mode: WorkflowExecuteMode;
    };
    workflow: {
        id?: string;
        name: string;
    };
}
export interface IProcessMessageDataHook {
    hook: string;
    parameters: any[];
}
export interface IWorkflowExecutionDataProcess {
    credentials: IWorkflowCredentials;
    destinationNode?: string;
    executionMode: WorkflowExecuteMode;
    executionData?: IRunExecutionData;
    runData?: IRunData;
    retryOf?: number | string;
    sessionId?: string;
    startNodes?: string[];
    workflowData: IWorkflowBase;
}
export interface IWorkflowExecutionDataProcessWithExecution extends IWorkflowExecutionDataProcess {
    credentialsOverwrite: ICredentialsOverwrite;
    credentialsTypeData: ICredentialsTypeData;
    executionId: string;
    nodeTypeData: ITransferNodeTypes;
}
export interface IWorkflowExecuteProcess {
    startedAt: Date;
    workflow: Workflow;
    workflowExecute: WorkflowExecute;
}
export {};
