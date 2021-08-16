import { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { ICredentialsOverwrite } from './';
declare class CredentialsOverwritesClass {
    private credentialTypes;
    private overwriteData;
    private resolvedTypes;
    init(overwriteData?: ICredentialsOverwrite): Promise<void>;
    __setData(overwriteData: ICredentialsOverwrite): void;
    applyOverwrite(type: string, data: ICredentialDataDecryptedObject): any;
    __getExtended(type: string): ICredentialDataDecryptedObject | undefined;
    get(type: string): ICredentialDataDecryptedObject | undefined;
    getAll(): ICredentialsOverwrite;
}
export declare function CredentialsOverwrites(): CredentialsOverwritesClass;
export {};
