import { IWorkflowExecuteProcess, IWorkflowExecutionDataProcessWithExecution } from './';
import { WorkflowExecute } from 'n8n-core';
import { ILogger, IRun, Workflow, WorkflowHooks } from 'n8n-workflow';
export declare class WorkflowRunnerProcess {
    data: IWorkflowExecutionDataProcessWithExecution | undefined;
    logger: ILogger;
    startedAt: Date;
    workflow: Workflow | undefined;
    workflowExecute: WorkflowExecute | undefined;
    executionIdCallback: (executionId: string) => void | undefined;
    childExecutions: {
        [key: string]: IWorkflowExecuteProcess;
    };
    static stopProcess(): Promise<void>;
    runWorkflow(inputData: IWorkflowExecutionDataProcessWithExecution): Promise<IRun>;
    sendHookToParentProcess(hook: string, parameters: any[]): Promise<void>;
    getProcessForwardHooks(): WorkflowHooks;
}
