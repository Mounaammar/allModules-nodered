import { Credentials } from 'n8n-core';
import { ICredentialDataDecryptedObject, ICredentialsExpressionResolveValues, ICredentialsHelper, INodeProperties, WorkflowExecuteMode } from 'n8n-workflow';
export declare class CredentialsHelper extends ICredentialsHelper {
    getCredentials(name: string, type: string): Credentials;
    getCredentialsProperties(type: string): INodeProperties[];
    getDecrypted(name: string, type: string, mode: WorkflowExecuteMode, raw?: boolean, expressionResolveValues?: ICredentialsExpressionResolveValues): ICredentialDataDecryptedObject;
    applyDefaultsAndOverwrites(decryptedDataOriginal: ICredentialDataDecryptedObject, type: string, mode: WorkflowExecuteMode, expressionResolveValues?: ICredentialsExpressionResolveValues): ICredentialDataDecryptedObject;
    updateCredentials(name: string, type: string, data: ICredentialDataDecryptedObject): Promise<void>;
}
