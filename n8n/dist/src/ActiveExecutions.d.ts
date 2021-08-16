/// <reference types="node" />
import { IRun } from 'n8n-workflow';
import { IExecutionsCurrentSummary, IWorkflowExecutionDataProcess } from '.';
import { ChildProcess } from 'child_process';
import * as PCancelable from 'p-cancelable';
export declare class ActiveExecutions {
    private activeExecutions;
    add(executionData: IWorkflowExecutionDataProcess, process?: ChildProcess): Promise<string>;
    attachWorkflowExecution(executionId: string, workflowExecution: PCancelable<IRun>): void;
    remove(executionId: string, fullRunData?: IRun): void;
    stopExecution(executionId: string, timeout?: string): Promise<IRun | undefined>;
    getPostExecutePromise(executionId: string): Promise<IRun | undefined>;
    getActiveExecutions(): IExecutionsCurrentSummary[];
}
export declare function getInstance(): ActiveExecutions;
