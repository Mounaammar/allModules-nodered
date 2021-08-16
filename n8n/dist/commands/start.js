"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Start = void 0;
const localtunnel = require("localtunnel");
const n8n_core_1 = require("n8n-core");
const command_1 = require("@oclif/command");
const open = require('open');
const Redis = require("ioredis");
const config = require("../config");
const src_1 = require("../src");
const Logger_1 = require("../src/Logger");
const n8n_workflow_1 = require("n8n-workflow");
let activeWorkflowRunner;
let processExistCode = 0;
class Start extends command_1.Command {
    static openBrowser() {
        const editorUrl = src_1.GenericHelpers.getBaseUrl();
        open(editorUrl, { wait: true })
            .catch((error) => {
            console.log(`\nWas not able to open URL in browser. Please open manually by visiting:\n${editorUrl}\n`);
        });
    }
    static async stopProcess() {
        Logger_1.getLogger().info('\nStopping n8n...');
        try {
            const externalHooks = src_1.ExternalHooks();
            await externalHooks.run('n8n.stop', []);
            setTimeout(() => {
                process.exit(processExistCode);
            }, 30000);
            const skipWebhookDeregistration = config.get('endpoints.skipWebhoooksDeregistrationOnShutdown');
            const removePromises = [];
            if (activeWorkflowRunner !== undefined && skipWebhookDeregistration !== true) {
                removePromises.push(activeWorkflowRunner.removeAll());
            }
            const testWebhooks = src_1.TestWebhooks.getInstance();
            removePromises.push(testWebhooks.removeAll());
            await Promise.all(removePromises);
            const activeExecutionsInstance = src_1.ActiveExecutions.getInstance();
            let executingWorkflows = activeExecutionsInstance.getActiveExecutions();
            let count = 0;
            while (executingWorkflows.length !== 0) {
                if (count++ % 4 === 0) {
                    console.log(`Waiting for ${executingWorkflows.length} active executions to finish...`);
                    executingWorkflows.map(execution => {
                        console.log(` - Execution ID ${execution.id}, workflow ID: ${execution.workflowId}`);
                    });
                }
                await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                });
                executingWorkflows = activeExecutionsInstance.getActiveExecutions();
            }
        }
        catch (error) {
            console.error('There was an error shutting down n8n.', error);
        }
        process.exit(processExistCode);
    }
    async run() {
        process.on('SIGTERM', Start.stopProcess);
        process.on('SIGINT', Start.stopProcess);
        const { flags } = this.parse(Start);
        await (async () => {
            try {
                const logger = Logger_1.getLogger();
                n8n_workflow_1.LoggerProxy.init(logger);
                logger.info('Initializing n8n process');
                const startDbInitPromise = src_1.Db.init().catch((error) => {
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
                const dbType = await src_1.GenericHelpers.getConfigValue('database.type');
                if (dbType === 'sqlite') {
                    const shouldRunVacuum = config.get('database.sqlite.executeVacuumOnStartup');
                    if (shouldRunVacuum) {
                        src_1.Db.collections.Execution.query('VACUUM;');
                    }
                }
                if (flags.tunnel === true) {
                    this.log('\nWaiting for tunnel ...');
                    let tunnelSubdomain;
                    if (process.env[n8n_core_1.TUNNEL_SUBDOMAIN_ENV] !== undefined && process.env[n8n_core_1.TUNNEL_SUBDOMAIN_ENV] !== '') {
                        tunnelSubdomain = process.env[n8n_core_1.TUNNEL_SUBDOMAIN_ENV];
                    }
                    else if (userSettings.tunnelSubdomain !== undefined) {
                        tunnelSubdomain = userSettings.tunnelSubdomain;
                    }
                    if (tunnelSubdomain === undefined) {
                        const availableCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
                        userSettings.tunnelSubdomain = Array.from({ length: 24 }).map(() => {
                            return availableCharacters.charAt(Math.floor(Math.random() * availableCharacters.length));
                        }).join('');
                        await n8n_core_1.UserSettings.writeUserSettings(userSettings);
                    }
                    const tunnelSettings = {
                        host: 'https://hooks.n8n.cloud',
                        subdomain: tunnelSubdomain,
                    };
                    const port = config.get('port');
                    const webhookTunnel = await localtunnel(port, tunnelSettings);
                    process.env.WEBHOOK_URL = webhookTunnel.url + '/';
                    this.log(`Tunnel URL: ${process.env.WEBHOOK_URL}\n`);
                    this.log('IMPORTANT! Do not share with anybody as it would give people access to your n8n instance!');
                }
                await src_1.Server.start();
                activeWorkflowRunner = src_1.ActiveWorkflowRunner.getInstance();
                await activeWorkflowRunner.init();
                const editorUrl = src_1.GenericHelpers.getBaseUrl();
                this.log(`\nEditor is now accessible via:\n${editorUrl}`);
                if (Boolean(process.stdout.isTTY) && process.stdin.setRawMode) {
                    process.stdin.setRawMode(true);
                    process.stdin.resume();
                    process.stdin.setEncoding('utf8');
                    let inputText = '';
                    if (flags.open === true) {
                        Start.openBrowser();
                    }
                    this.log(`\nPress "o" to open in Browser.`);
                    process.stdin.on('data', (key) => {
                        if (key === 'o') {
                            Start.openBrowser();
                            inputText = '';
                        }
                        else if (key.charCodeAt(0) === 3) {
                            Start.stopProcess();
                        }
                        else {
                            if (key.charCodeAt(0) === 13) {
                                process.stdout.write('\n');
                                inputText = '';
                            }
                            else {
                                inputText += key;
                                process.stdout.write(key);
                            }
                        }
                    });
                }
            }
            catch (error) {
                this.error(`There was an error: ${error.message}`);
                processExistCode = 1;
                process.emit('SIGINT');
            }
        })();
    }
}
exports.Start = Start;
Start.description = 'Starts n8n. Makes Web-UI available and starts active workflows';
Start.examples = [
    `$ n8n start`,
    `$ n8n start --tunnel`,
    `$ n8n start -o`,
    `$ n8n start --tunnel -o`,
];
Start.flags = {
    help: command_1.flags.help({ char: 'h' }),
    open: command_1.flags.boolean({
        char: 'o',
        description: 'opens the UI automatically in browser',
    }),
    tunnel: command_1.flags.boolean({
        description: 'runs the webhooks via a hooks.n8n.cloud tunnel server. Use only for testing and development!',
    }),
};
//# sourceMappingURL=start.js.map