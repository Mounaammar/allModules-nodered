import { ICredentialNodeAccess } from 'n8n-workflow';
import { ICredentialsDb } from '../..';
export declare class CredentialsEntity implements ICredentialsDb {
    id: number;
    name: string;
    data: string;
    type: string;
    nodesAccess: ICredentialNodeAccess[];
    createdAt: Date;
    updatedAt: Date;
    setUpdateDate(): void;
}
