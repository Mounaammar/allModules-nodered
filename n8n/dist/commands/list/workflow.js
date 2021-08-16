"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListWorkflowCommand = void 0;
const command_1 = require("@oclif/command");
const src_1 = require("../../src");
class ListWorkflowCommand extends command_1.Command {
    async run() {
        const { flags } = this.parse(ListWorkflowCommand);
        if (flags.active !== undefined && !['true', 'false'].includes(flags.active)) {
            this.error('The --active flag has to be passed using true or false');
        }
        try {
            await src_1.Db.init();
            const findQuery = {};
            if (flags.active !== undefined) {
                findQuery.active = flags.active === 'true';
            }
            const workflows = await src_1.Db.collections.Workflow.find(findQuery);
            if (flags.onlyId) {
                workflows.forEach(workflow => console.log(workflow.id));
            }
            else {
                workflows.forEach(workflow => console.log(workflow.id + "|" + workflow.name));
            }
        }
        catch (e) {
            console.error('\nGOT ERROR');
            console.log('====================================');
            console.error(e.message);
            console.error(e.stack);
            this.exit(1);
        }
        this.exit();
    }
}
exports.ListWorkflowCommand = ListWorkflowCommand;
ListWorkflowCommand.description = '\nList workflows';
ListWorkflowCommand.examples = [
    '$ n8n list:workflow',
    '$ n8n list:workflow --active=true --onlyId',
    '$ n8n list:workflow --active=false',
];
ListWorkflowCommand.flags = {
    help: command_1.flags.help({ char: 'h' }),
    active: command_1.flags.string({
        description: 'Filters workflows by active status. Can be true or false',
    }),
    onlyId: command_1.flags.boolean({
        description: 'Outputs workflow IDs only, one per line.',
    }),
};
//# sourceMappingURL=workflow.js.map