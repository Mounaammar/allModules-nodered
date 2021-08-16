import { Request, Response } from 'express';
import { IExecutionDb, IExecutionFlatted, IExecutionFlattedDb, IExecutionResponse } from './';
export declare class ResponseError extends Error {
    httpStatusCode?: number;
    errorCode?: number;
    constructor(message: string, errorCode?: number, httpStatusCode?: number);
}
export declare function basicAuthAuthorizationError(resp: Response, realm: string, message?: string): void;
export declare function jwtAuthAuthorizationError(resp: Response, message?: string): void;
export declare function sendSuccessResponse(res: Response, data: any, raw?: boolean, responseCode?: number): void;
export declare function sendErrorResponse(res: Response, error: ResponseError): void;
export declare function send(processFunction: (req: Request, res: Response) => Promise<any>): (req: Request, res: Response) => Promise<void>;
export declare function flattenExecutionData(fullExecutionData: IExecutionDb): IExecutionFlatted;
export declare function unflattenExecutionData(fullExecutionData: IExecutionFlattedDb): IExecutionResponse;
