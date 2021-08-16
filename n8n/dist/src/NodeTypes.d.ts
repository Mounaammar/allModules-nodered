import { INodeType, INodeTypeData, INodeTypes } from 'n8n-workflow';
declare class NodeTypesClass implements INodeTypes {
    nodeTypes: INodeTypeData;
    init(nodeTypes: INodeTypeData): Promise<void>;
    getAll(): INodeType[];
    getByName(nodeType: string): INodeType | undefined;
}
export declare function NodeTypes(): NodeTypesClass;
export {};
