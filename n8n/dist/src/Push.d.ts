import * as express from 'express';
import { IPushDataType } from '.';
export declare class Push {
    private channel;
    private connections;
    constructor();
    add(sessionId: string, req: express.Request, res: express.Response): void;
    send(type: IPushDataType, data: any, sessionId?: string): void;
}
export declare function getInstance(): Push;
