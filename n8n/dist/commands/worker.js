"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
const command_1 = require("@oclif/command");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const src_1 = require("../src");
const Logger_1 = require("../src/Logger");
const n8n_workflow_2 = require("n8n-workflow");
const config = require("../config");
const Queue = require("../src/Queue");
class Worker extends command_1.Command {
    static async stopProcess() {
        n8n_workflow_2.LoggerProxy.info(`Stopping n8n...`);
        Worker.jobQueue.pause(true);
        try {
            const externalHooks = src_1.ExternalHooks();
            await externalHooks.run('n8n.stop', []);
            const maxStopTime = 30000;
            const stopTime = new Date().getTime() + maxStopTime;
            setTimeout(() => {
                process.exit(Worker.processExistCode);
            }, maxStopTime);
            let count = 0;
            while (Object.keys(Worker.runningJobs).length !== 0) {
                if (count++ % 4 === 0) {
                    const waitLeft = Math.ceil((stopTime - new Date().getTime()) / 1000);
                    n8n_workflow_2.LoggerProxy.info(`Waiting for ${Object.keys(Worker.runningJobs).length} active executions to finish... (wait ${waitLeft} more seconds)`);
                }
                await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                });
            }
        }
        catch (error) {
            n8n_workflow_2.LoggerProxy.error('There was an error shutting down n8n.', error);
        }
        process.exit(Worker.processExistCode);
    }
    async runJob(job, nodeTypes) {
        const jobData = job.data;
        const executionDb = await src_1.Db.collections.Execution.findOne(jobData.executionId);
        const currentExecutionDb = src_1.ResponseHelper.unflattenExecutionData(executionDb);
        n8n_workflow_2.LoggerProxy.info(`Start job: ${job.id} (Workflow ID: ${currentExecutionDb.workflowData.id} | Execution: ${jobData.executionId})`);
        let staticData = currentExecutionDb.workflowData.staticData;
        if (jobData.loadStaticData === true) {
            const findOptions = {
                select: ['id', 'staticData'],
            };
            const workflowData = await src_1.Db.collections.Workflow.findOne(currentExecutionDb.workflowData.id, findOptions);
            if (workflowData === undefined) {
                throw new Error(`The workflow with the ID "${currentExecutionDb.workflowData.id}" could not be found`);
            }
            staticData = workflowData.staticData;
        }
        let workflowTimeout = config.get('executions.timeout');
        if (currentExecutionDb.workflowData.settings && currentExecutionDb.workflowData.settings.executionTimeout) {
            workflowTimeout = currentExecutionDb.workflowData.settings.executionTimeout;
        }
        let executionTimeoutTimestamp;
        if (workflowTimeout > 0) {
            workflowTimeout = Math.min(workflowTimeout, config.get('executions.maxTimeout'));
            executionTimeoutTimestamp = Date.now() + workflowTimeout * 1000;
        }
        const workflow = new n8n_workflow_1.Workflow({ id: currentExecutionDb.workflowData.id, name: currentExecutionDb.workflowData.name, nodes: currentExecutionDb.workflowData.nodes, connections: currentExecutionDb.workflowData.connections, active: currentExecutionDb.workflowData.active, nodeTypes, staticData, settings: currentExecutionDb.workflowData.settings });
        const credentials = await src_1.WorkflowCredentials(currentExecutionDb.workflowData.nodes);
        const additionalData = await src_1.WorkflowExecuteAdditionalData.getBase(credentials, undefined, executionTimeoutTimestamp);
        additionalData.hooks = src_1.WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(currentExecutionDb.mode, job.data.executionId, currentExecutionDb.workflowData, { retryOf: currentExecutionDb.retryOf });
        let workflowExecute;
        let workflowRun;
        if (currentExecutionDb.data !== undefined) {
            workflowExecute = new n8n_core_1.WorkflowExecute(additionalData, currentExecutionDb.mode, currentExecutionDb.data);
            workflowRun = workflowExecute.processRunExecutionData(workflow);
        }
        else {
            workflowExecute = new n8n_core_1.WorkflowExecute(additionalData, currentExecutionDb.mode);
            workflowRun = workflowExecute.run(workflow);
        }
        Worker.runningJobs[job.id] = workflowRun;
        const runData = await workflowRun;
        delete Worker.runningJobs[job.id];
        return {
            success: true,
        };
    }
    async run() {
        const logger = Logger_1.getLogger();
        n8n_workflow_2.LoggerProxy.init(logger);
        console.info('Starting n8n worker...');
        process.on('SIGTERM', Worker.stopProcess);
        process.on('SIGINT', Worker.stopProcess);
        await (async () => {
            try {
                const { flags } = this.parse(Worker);
                const startDbInitPromise = src_1.Db.init().catch(error => {
                    logger.error(`There was an error initializing DB: "${error.message}"`);
                    Worker.processExistCode = 1;
                    process.emit('SIGINT');
                    process.exit(1);
                });
                await n8n_core_1.UserSettings.prepareUserSettings();
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
                const redisConnectionTimeoutLimit = config.get('queue.bull.redis.timeoutThreshold');
                Worker.jobQueue = Queue.getInstance().getBullObjectInstance();
                Worker.jobQueue.process(flags.concurrency, (job) => this.runJob(job, nodeTypes));
                const versions = await src_1.GenericHelpers.getVersions();
                console.info('\nn8n worker is now ready');
                console.info(` * Version: ${versions.cli}`);
                console.info(` * Concurrency: ${flags.concurrency}`);
                console.info('');
                Worker.jobQueue.on('global:progress', (jobId, progress) => {
                    if (progress === -1) {
                        if (Worker.runningJobs[jobId] !== undefined) {
                            Worker.runningJobs[jobId].cancel();
                            delete Worker.runningJobs[jobId];
                        }
                    }
                });
                let lastTimer = 0, cumulativeTimeout = 0;
                Worker.jobQueue.on('error', (error) => {
                    if (error.toString().includes('ECONNREFUSED') === true) {
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
                        logger.warn('Redis unavailable - trying to reconnect...');
                    }
                    else if (error.toString().includes('Error initializing Lua scripts') === true) {
                        logger.error('Error initializing worker.');
                        process.exit(2);
                    }
                    else {
                        logger.error('Error from queue: ', error);
                    }
                });
            }
            catch (error) {
                logger.error(`Worker process cannot continue. "${error.message}"`);
                Worker.processExistCode = 1;
                process.emit('SIGINT');
                process.exit(1);
            }
        })();
    }
}
exports.Worker = Worker;
Worker.description = '\nStarts a n8n worker';
Worker.examples = [
    `$ n8n worker --concurrency=5`,
];
Worker.flags = {
    help: command_1.flags.help({ char: 'h' }),
    concurrency: command_1.flags.integer({
        default: 10,
        description: 'How many jobs can run in parallel.',
    }),
};
Worker.runningJobs = {};
Worker.processExistCode = 0;
//# sourceMappingURL=worker.js.map