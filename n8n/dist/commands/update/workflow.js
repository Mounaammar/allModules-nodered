"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWorkflowCommand = void 0;
const command_1 = require("@oclif/command");
const src_1 = require("../../src");
const Logger_1 = require("../../src/Logger");
const n8n_workflow_1 = require("n8n-workflow");
class UpdateWorkflowCommand extends command_1.Command {
    async run() {
        const logger = Logger_1.getLogger();
        n8n_workflow_1.LoggerProxy.init(logger);
        const { flags } = this.parse(UpdateWorkflowCommand);
        if (!flags.all && !flags.id) {
            console.info(`Either option "--all" or "--id" have to be set!`);
            return;
        }
        if (flags.all && flags.id) {
            console.info(`Either something else on top should be "--all" or "--id" can be set never both!`);
            return;
        }
        const updateQuery = {};
        if (flags.active === undefined) {
            console.info(`No update flag like "--active=true" has been set!`);
            return;
        }
        else {
            if (!['false', 'true'].includes(flags.active)) {
                console.info(`Valid values for flag "--active" are only "false" or "true"!`);
                return;
            }
            updateQuery.active = flags.active === 'true';
        }
        try {
            await src_1.Db.init();
            const findQuery = {};
            if (flags.id) {
                console.info(`Deactivating workflow with ID: ${flags.id}`);
                findQuery.id = flags.id;
            }
            else {
                console.info('Deactivating all workflows');
                findQuery.active = true;
            }
            await src_1.Db.collections.Workflow.update(findQuery, updateQuery);
            console.info('Done');
        }
        catch (e) {
            console.error('Error updating database. See log messages for details.');
            logger.error('\nGOT ERROR');
            logger.info('====================================');
            logger.error(e.message);
            logger.error(e.stack);
            this.exit(1);
        }
        this.exit();
    }
}
exports.UpdateWorkflowCommand = UpdateWorkflowCommand;
UpdateWorkflowCommand.description = '\Update workflows';
UpdateWorkflowCommand.examples = [
    `$ n8n update:workflow --all --active=false`,
    `$ n8n update:workflow --id=5 --active=true`,
];
UpdateWorkflowCommand.flags = {
    help: command_1.flags.help({ char: 'h' }),
    active: command_1.flags.string({
        description: 'Active state the workflow/s should be set to',
    }),
    all: command_1.flags.boolean({
        description: 'Operate on all workflows',
    }),
    id: command_1.flags.string({
        description: 'The ID of the workflow to operate on',
    }),
};
//# sourceMappingURL=workflow.js.map