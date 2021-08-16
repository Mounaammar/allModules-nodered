import { IConnections, IDataObject, INode, IWorkflowSettings } from 'n8n-workflow';
import { IWorkflowDb } from '../../';
import { TagEntity } from './TagEntity';
export declare class WorkflowEntity implements IWorkflowDb {
    id: number;
    name: string;
    active: boolean;
    nodes: INode[];
    connections: IConnections;
    createdAt: Date;
    updatedAt: Date;
    settings?: IWorkflowSettings;
    staticData?: IDataObject;
    tags: TagEntity[];
    setUpdateDate(): void;
}
