"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportWorkflowsCommand = void 0;
const command_1 = require("@oclif/command");
const src_1 = require("../../src");
const Logger_1 = require("../../src/Logger");
const n8n_workflow_1 = require("n8n-workflow");
const fs = require("fs");
const path = require("path");
class ExportWorkflowsCommand extends command_1.Command {
    async run() {
        const logger = Logger_1.getLogger();
        n8n_workflow_1.LoggerProxy.init(logger);
        const { flags } = this.parse(ExportWorkflowsCommand);
        if (flags.backup) {
            flags.all = true;
            flags.pretty = true;
            flags.separate = true;
        }
        if (!flags.all && !flags.id) {
            console.info(`Either option "--all" or "--id" have to be set!`);
            return;
        }
        if (flags.all && flags.id) {
            console.info(`You should either use "--all" or "--id" but never both!`);
            return;
        }
        if (flags.separate) {
            try {
                if (!flags.output) {
                    console.info(`You must inform an output directory via --output when using --separate`);
                    return;
                }
                if (fs.existsSync(flags.output)) {
                    if (!fs.lstatSync(flags.output).isDirectory()) {
                        console.info(`The paramenter --output must be a directory`);
                        return;
                    }
                }
                else {
                    fs.mkdirSync(flags.output, { recursive: true });
                }
            }
            catch (e) {
                console.error('Aborting execution as a filesystem error has been encountered while creating the output directory. See log messages for details.');
                logger.error('\nFILESYSTEM ERROR');
                logger.info('====================================');
                logger.error(e.message);
                logger.error(e.stack);
                this.exit(1);
            }
        }
        else if (flags.output) {
            if (fs.existsSync(flags.output)) {
                if (fs.lstatSync(flags.output).isDirectory()) {
                    console.info(`The paramenter --output must be a writeble file`);
                    return;
                }
            }
        }
        try {
            await src_1.Db.init();
            const findQuery = {};
            if (flags.id) {
                findQuery.id = flags.id;
            }
            const workflows = await src_1.Db.collections.Workflow.find(findQuery);
            if (workflows.length === 0) {
                throw new Error('No workflows found with specified filters.');
            }
            if (flags.separate) {
                let fileContents, i;
                for (i = 0; i < workflows.length; i++) {
                    fileContents = JSON.stringify(workflows[i], null, flags.pretty ? 2 : undefined);
                    const filename = (flags.output.endsWith(path.sep) ? flags.output : flags.output + path.sep) + workflows[i].id + '.json';
                    fs.writeFileSync(filename, fileContents);
                }
                console.info(`Successfully exported ${i} workflows.`);
            }
            else {
                const fileContents = JSON.stringify(workflows, null, flags.pretty ? 2 : undefined);
                if (flags.output) {
                    fs.writeFileSync(flags.output, fileContents);
                    console.info(`Successfully exported ${workflows.length} ${workflows.length === 1 ? 'workflow.' : 'workflows.'}`);
                }
                else {
                    console.info(fileContents);
                }
            }
            process.exit(0);
        }
        catch (error) {
            console.error('Error exporting workflows. See log messages for details.');
            logger.error(error.message);
            this.exit(1);
        }
    }
}
exports.ExportWorkflowsCommand = ExportWorkflowsCommand;
ExportWorkflowsCommand.description = 'Export workflows';
ExportWorkflowsCommand.examples = [
    `$ n8n export:workflow --all`,
    `$ n8n export:workflow --id=5 --output=file.json`,
    `$ n8n export:workflow --all --output=backups/latest/`,
    `$ n8n export:workflow --backup --output=backups/latest/`,
];
ExportWorkflowsCommand.flags = {
    help: command_1.flags.help({ char: 'h' }),
    all: command_1.flags.boolean({
        description: 'Export all workflows',
    }),
    backup: command_1.flags.boolean({
        description: 'Sets --all --pretty --separate for simple backups. Only --output has to be set additionally.',
    }),
    id: command_1.flags.string({
        description: 'The ID of the workflow to export',
    }),
    output: command_1.flags.string({
        char: 'o',
        description: 'Output file name or directory if using separate files',
    }),
    pretty: command_1.flags.boolean({
        description: 'Format the output in an easier to read fashion',
    }),
    separate: command_1.flags.boolean({
        description: 'Exports one file per workflow (useful for versioning). Must inform a directory via --output.',
    }),
};
//# sourceMappingURL=workflow.js.map