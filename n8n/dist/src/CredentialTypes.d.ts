import { ICredentialType, ICredentialTypes as ICredentialTypesInterface } from 'n8n-workflow';
import { ICredentialsTypeData } from './';
declare class CredentialTypesClass implements ICredentialTypesInterface {
    credentialTypes: ICredentialsTypeData;
    init(credentialTypes: ICredentialsTypeData): Promise<void>;
    getAll(): ICredentialType[];
    getByName(credentialType: string): ICredentialType;
}
export declare function CredentialTypes(): CredentialTypesClass;
export {};
