"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Webhook = void 0;
const n8n_core_1 = require("n8n-core");
const command_1 = require("@oclif/command");
const Redis = require("ioredis");
const config = require("../config");
const src_1 = require("../src");
const Logger_1 = require("../src/Logger");
const n8n_workflow_1 = require("n8n-workflow");
let activeWorkflowRunner;
let processExistCode = 0;
class Webhook extends command_1.Command {
    static async stopProcess() {
        n8n_workflow_1.LoggerProxy.info(`\nStopping n8n...`);
        try {
            const externalHooks = src_1.ExternalHooks();
            await externalHooks.run('n8n.stop', []);
            setTimeout(() => {
                process.exit(processExistCode);
            }, 30000);
            const activeExecutionsInstance = src_1.ActiveExecutions.getInstance();
            let executingWorkflows = activeExecutionsInstance.getActiveExecutions();
            let count = 0;
            while (executingWorkflows.length !== 0) {
                if (count++ % 4 === 0) {
                    n8n_workflow_1.LoggerProxy.info(`Waiting for ${executingWorkflows.length} active executions to finish...`);
                }
                await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                });
                executingWorkflows = activeExecutionsInstance.getActiveExecutions();
            }
        }
        catch (error) {
            n8n_workflow_1.LoggerProxy.error('There was an error shutting down n8n.', error);
        }
        process.exit(processExistCode);
    }
    async run() {
        const logger = Logger_1.getLogger();
        n8n_workflow_1.LoggerProxy.init(logger);
        process.on('SIGTERM', Webhook.stopProcess);
        process.on('SIGINT', Webhook.stopProcess);
        const { flags } = this.parse(Webhook);
        await (async () => {
            if (config.get('executions.mode') !== 'queue') {
                this.error('Webhook processes can only run with execution mode as queue.');
            }
            try {
                const startDbInitPromise = src_1.Db.init().catch(error => {
                    logger.error(`There was an error initializing DB: "${error.message}"`);
                    processExistCode = 1;
                    process.emit('SIGINT');
                    process.exit(1);
                });
                const userSettings = await n8n_core_1.UserSettings.prepareUserSettings();
                const loadNodesAndCredentials = src_1.LoadNodesAndCredentials();
                await loadNodesAndCredentials.init();
                const credentialsOverwrites = src_1.CredentialsOverwrites();
                await credentialsOverwrites.init();
                const externalHooks = src_1.ExternalHooks();
                await externalHooks.init();
                const nodeTypes = src_1.NodeTypes();
                await nodeTypes.init(loadNodesAndCredentials.nodeTypes);
                const credentialTypes = src_1.CredentialTypes();
                await credentialTypes.init(loadNodesAndCredentials.credentialTypes);
                await startDbInitPromise;
                if (config.get('executions.mode') === 'queue') {
                    const redisHost = config.get('queue.bull.redis.host');
                    const redisPassword = config.get('queue.bull.redis.password');
                    const redisPort = config.get('queue.bull.redis.port');
                    const redisDB = config.get('queue.bull.redis.db');
                    const redisConnectionTimeoutLimit = config.get('queue.bull.redis.timeoutThreshold');
                    let lastTimer = 0, cumulativeTimeout = 0;
                    const settings = {
                        retryStrategy: (times) => {
                            const now = Date.now();
                            if (now - lastTimer > 30000) {
                                lastTimer = now;
                                cumulativeTimeout = 0;
                            }
                            else {
                                cumulativeTimeout += now - lastTimer;
                                lastTimer = now;
                                if (cumulativeTimeout > redisConnectionTimeoutLimit) {
                                    logger.error('Unable to connect to Redis after ' + redisConnectionTimeoutLimit + ". Exiting process.");
                                    process.exit(1);
                                }
                            }
                            return 500;
                        },
                    };
                    if (redisHost) {
                        settings.host = redisHost;
                    }
                    if (redisPassword) {
                        settings.password = redisPassword;
                    }
                    if (redisPort) {
                        settings.port = redisPort;
                    }
                    if (redisDB) {
                        settings.db = redisDB;
                    }
                    const redis = new Redis(settings);
                    redis.on('error', (error) => {
                        if (error.toString().includes('ECONNREFUSED') === true) {
                            logger.warn('Redis unavailable - trying to reconnect...');
                        }
                        else {
                            logger.warn('Error with Redis: ', error);
                        }
                    });
                }
                await src_1.WebhookServer.start();
                activeWorkflowRunner = src_1.ActiveWorkflowRunner.getInstance();
                await activeWorkflowRunner.initWebhooks();
                const editorUrl = src_1.GenericHelpers.getBaseUrl();
                console.info('Webhook listener waiting for requests.');
            }
            catch (error) {
                console.error('Exiting due to error. See log message for details.');
                logger.error(`Webhook process cannot continue. "${error.message}"`);
                processExistCode = 1;
                process.emit('SIGINT');
                process.exit(1);
            }
        })();
    }
}
exports.Webhook = Webhook;
Webhook.description = 'Starts n8n webhook process. Intercepts only production URLs.';
Webhook.examples = [
    `$ n8n webhook`,
];
Webhook.flags = {
    help: command_1.flags.help({ char: 'h' }),
};
//# sourceMappingURL=webhook.js.map