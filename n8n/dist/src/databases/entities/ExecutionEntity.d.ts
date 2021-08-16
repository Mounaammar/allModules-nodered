import { WorkflowExecuteMode } from 'n8n-workflow';
import { IExecutionFlattedDb, IWorkflowDb } from '../../';
export declare class ExecutionEntity implements IExecutionFlattedDb {
    id: number;
    data: string;
    finished: boolean;
    mode: WorkflowExecuteMode;
    retryOf: string;
    retrySuccessId: string;
    startedAt: Date;
    stoppedAt: Date;
    workflowData: IWorkflowDb;
    workflowId: string;
}
