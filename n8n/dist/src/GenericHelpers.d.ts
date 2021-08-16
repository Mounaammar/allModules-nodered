import * as express from 'express';
import { IPackageVersions } from './';
export declare function getBaseUrl(): string;
export declare function getSessionId(req: express.Request): string | undefined;
export declare function getVersions(): Promise<IPackageVersions>;
export declare function getConfigValue(configKey: string): Promise<string | boolean | number | undefined>;
export declare function getConfigValueSync(configKey: string): string | boolean | number | undefined;
