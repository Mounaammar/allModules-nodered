import * as convict from 'convict';
declare const config: convict.Config<{
    database: {
        type: any;
        tablePrefix: any;
        postgresdb: any;
        mysqldb: any;
        sqlite: any;
    };
    credentials: {
        overwrite: any;
    };
    workflows: {
        defaultName: any;
    };
    executions: {
        process: any;
        mode: any;
        timeout: any;
        maxTimeout: any;
        saveDataOnError: any;
        saveDataOnSuccess: any;
        saveExecutionProgress: any;
        saveDataManualExecutions: any;
        pruneData: any;
        pruneDataMaxAge: any;
        pruneDataTimeout: any;
    };
    queue: {
        bull: any;
    };
    generic: {
        timezone: any;
    };
    path: string;
    host: string;
    port: number;
    listen_address: string;
    protocol: string;
    ssl_key: string;
    ssl_cert: string;
    security: {
        excludeEndpoints: any;
        basicAuth: any;
        jwtAuth: any;
    };
    endpoints: {
        payloadSizeMax: any;
        metrics: any;
        rest: any;
        webhook: any;
        webhookTest: any;
        disableProductionWebhooksOnMainProcess: any;
        skipWebhoooksDeregistrationOnShutdown: any;
    };
    externalHookFiles: string;
    nodes: {
        include: any;
        exclude: any;
        errorTriggerType: any;
    };
    logs: {
        level: any;
        output: any;
        file: any;
    };
}>;
export = config;
