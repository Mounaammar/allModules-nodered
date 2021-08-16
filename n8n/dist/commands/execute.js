"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Execute = void 0;
const fs_1 = require("fs");
const command_1 = require("@oclif/command");
const n8n_core_1 = require("n8n-core");
const src_1 = require("../src");
const Logger_1 = require("../src/Logger");
const n8n_workflow_1 = require("n8n-workflow");
class Execute extends command_1.Command {
    async run() {
        const logger = Logger_1.getLogger();
        n8n_workflow_1.LoggerProxy.init(logger);
        const { flags } = this.parse(Execute);
        const startDbInitPromise = src_1.Db.init();
        const loadNodesAndCredentials = src_1.LoadNodesAndCredentials();
        const loadNodesAndCredentialsPromise = loadNodesAndCredentials.init();
        if (!flags.id && !flags.file) {
            console.info(`Either option "--id" or "--file" have to be set!`);
            return;
        }
        if (flags.id && flags.file) {
            console.info(`Either "id" or "file" can be set never both!`);
            return;
        }
        let workflowId;
        let workflowData = undefined;
        if (flags.file) {
            try {
                workflowData = JSON.parse(await fs_1.promises.readFile(flags.file, 'utf8'));
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    console.info(`The file "${flags.file}" could not be found.`);
                    return;
                }
                throw error;
            }
            if (workflowData === undefined || workflowData.nodes === undefined || workflowData.connections === undefined) {
                console.info(`The file "${flags.file}" does not contain valid workflow data.`);
                return;
            }
            workflowId = workflowData.id.toString();
        }
        await startDbInitPromise;
        if (flags.id) {
            workflowId = flags.id;
            workflowData = await src_1.Db.collections.Workflow.findOne(workflowId);
            if (workflowData === undefined) {
                console.info(`The workflow with the id "${workflowId}" does not exist.`);
                process.exit(1);
            }
        }
        await n8n_core_1.UserSettings.prepareUserSettings();
        await loadNodesAndCredentialsPromise;
        const credentialsOverwrites = src_1.CredentialsOverwrites();
        await credentialsOverwrites.init();
        const externalHooks = src_1.ExternalHooks();
        await externalHooks.init();
        const nodeTypes = src_1.NodeTypes();
        await nodeTypes.init(loadNodesAndCredentials.nodeTypes);
        const credentialTypes = src_1.CredentialTypes();
        await credentialTypes.init(loadNodesAndCredentials.credentialTypes);
        if (!src_1.WorkflowHelpers.isWorkflowIdValid(workflowId)) {
            workflowId = undefined;
        }
        const requiredNodeTypes = ['n8n-nodes-base.start'];
        let startNode = undefined;
        for (const node of workflowData.nodes) {
            if (requiredNodeTypes.includes(node.type)) {
                startNode = node;
                break;
            }
        }
        if (startNode === undefined) {
            console.info(`The workflow does not contain a "Start" node. So it can not be executed.`);
            return Promise.resolve();
        }
        try {
            const credentials = await src_1.WorkflowCredentials(workflowData.nodes);
            const runData = {
                credentials,
                executionMode: 'cli',
                startNodes: [startNode.name],
                workflowData: workflowData,
            };
            const workflowRunner = new src_1.WorkflowRunner();
            const executionId = await workflowRunner.run(runData);
            const activeExecutions = src_1.ActiveExecutions.getInstance();
            const data = await activeExecutions.getPostExecutePromise(executionId);
            if (data === undefined) {
                throw new Error('Workflow did not return any data!');
            }
            if (data.data.resultData.error) {
                console.info('Execution was NOT successful. See log message for details.');
                logger.info('Execution error:');
                logger.info('====================================');
                logger.info(JSON.stringify(data, null, 2));
                const { error } = data.data.resultData;
                throw Object.assign(Object.assign({}, error), { stack: error.stack });
            }
            if (flags.rawOutput === undefined) {
                this.log('Execution was successful:');
                this.log('====================================');
            }
            this.log(JSON.stringify(data, null, 2));
        }
        catch (e) {
            console.error('Error executing workflow. See log messages for details.');
            logger.error('\nExecution error:');
            logger.info('====================================');
            logger.error(e.message);
            logger.error(e.stack);
            this.exit(1);
        }
        this.exit();
    }
}
exports.Execute = Execute;
Execute.description = '\nExecutes a given workflow';
Execute.examples = [
    `$ n8n execute --id=5`,
    `$ n8n execute --file=workflow.json`,
];
Execute.flags = {
    help: command_1.flags.help({ char: 'h' }),
    file: command_1.flags.string({
        description: 'path to a workflow file to execute',
    }),
    id: command_1.flags.string({
        description: 'id of the workflow to execute',
    }),
    rawOutput: command_1.flags.boolean({
        description: 'Outputs only JSON data, with no other text',
    }),
};
//# sourceMappingURL=execute.js.map