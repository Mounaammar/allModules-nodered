import { ActiveExecutions, ICredentialsOverwrite, IProcessMessageDataHook, IWorkflowExecutionDataProcess, Push } from './';
import { ExecutionError, WorkflowExecuteMode, WorkflowHooks } from 'n8n-workflow';
import * as Bull from 'bull';
export declare class WorkflowRunner {
    activeExecutions: ActiveExecutions.ActiveExecutions;
    credentialsOverwrites: ICredentialsOverwrite;
    push: Push.Push;
    jobQueue: Bull.Queue;
    constructor();
    processHookMessage(workflowHooks: WorkflowHooks, hookData: IProcessMessageDataHook): void;
    processError(error: ExecutionError, startedAt: Date, executionMode: WorkflowExecuteMode, executionId: string): void;
    run(data: IWorkflowExecutionDataProcess, loadStaticData?: boolean, realtime?: boolean): Promise<string>;
    runMainProcess(data: IWorkflowExecutionDataProcess, loadStaticData?: boolean): Promise<string>;
    runBull(data: IWorkflowExecutionDataProcess, loadStaticData?: boolean, realtime?: boolean): Promise<string>;
    runSubprocess(data: IWorkflowExecutionDataProcess, loadStaticData?: boolean): Promise<string>;
}
