import { TagEntity } from "./databases/entities/TagEntity";
import { ITagWithCountDb } from "./Interfaces";
export declare function sortByRequestOrder(tagsDb: TagEntity[], tagIds: string[]): TagEntity[];
export declare function validateTag(newTag: TagEntity): Promise<void>;
export declare function throwDuplicateEntryError(error: Error): void;
export declare function getTagsWithCountDb(tablePrefix: string): Promise<ITagWithCountDb[]>;
export declare function createRelations(workflowId: string, tagIds: string[], tablePrefix: string): Promise<import("typeorm").InsertResult>;
export declare function removeRelations(workflowId: string, tablePrefix: string): Promise<import("typeorm").DeleteResult>;
