import { CodexData, ICredentialType, ILogger, INodeType, INodeTypeData } from 'n8n-workflow';
declare class LoadNodesAndCredentialsClass {
    nodeTypes: INodeTypeData;
    credentialTypes: {
        [key: string]: ICredentialType;
    };
    excludeNodes: string[] | undefined;
    includeNodes: string[] | undefined;
    nodeModulesPath: string;
    logger: ILogger;
    init(): Promise<void>;
    getN8nNodePackages(): Promise<string[]>;
    loadCredentialsFromFile(credentialName: string, filePath: string): Promise<void>;
    loadNodeFromFile(packageName: string, nodeName: string, filePath: string): Promise<void>;
    getCodex(filePath: string): CodexData;
    addCodex({ node, filePath, isCustom }: {
        node: INodeType;
        filePath: string;
        isCustom: boolean;
    }): void;
    loadDataFromDirectory(setPackageName: string, directory: string): Promise<void>;
    loadDataFromPackage(packageName: string): Promise<void>;
}
export declare function LoadNodesAndCredentials(): LoadNodesAndCredentialsClass;
export {};
