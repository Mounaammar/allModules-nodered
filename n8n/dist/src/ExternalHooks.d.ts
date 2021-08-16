import { IExternalHooksClass, IExternalHooksFileData } from './';
declare class ExternalHooksClass implements IExternalHooksClass {
    externalHooks: {
        [key: string]: Array<() => {}>;
    };
    initDidRun: boolean;
    init(): Promise<void>;
    reload(externalHooks?: IExternalHooksFileData): Promise<void>;
    loadHooksFiles(reload?: boolean): Promise<void>;
    loadHooks(hookFileData: IExternalHooksFileData): void;
    run(hookName: string, hookParameters?: any[]): Promise<void>;
    exists(hookName: string): boolean;
}
export declare function ExternalHooks(): ExternalHooksClass;
export {};
