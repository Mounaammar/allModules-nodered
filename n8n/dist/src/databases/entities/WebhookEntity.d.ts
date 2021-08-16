import { IWebhookDb } from '../../Interfaces';
export declare class WebhookEntity implements IWebhookDb {
    workflowId: number;
    webhookPath: string;
    method: string;
    node: string;
    webhookId: string;
    pathLength: number;
}
