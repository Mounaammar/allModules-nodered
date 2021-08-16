import { ITagDb } from '../../Interfaces';
import { WorkflowEntity } from './WorkflowEntity';
export declare class TagEntity implements ITagDb {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    workflows: WorkflowEntity[];
    setUpdateDate(): void;
}
