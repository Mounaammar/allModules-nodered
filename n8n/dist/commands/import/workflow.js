"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportWorkflowsCommand = void 0;
const command_1 = require("@oclif/command");
const src_1 = require("../../src");
const Logger_1 = require("../../src/Logger");
const n8n_workflow_1 = require("n8n-workflow");
const fs = require("fs");
const glob = require("glob-promise");
const path = require("path");
const n8n_core_1 = require("n8n-core");
class ImportWorkflowsCommand extends command_1.Command {
    async run() {
        const logger = Logger_1.getLogger();
        n8n_workflow_1.LoggerProxy.init(logger);
        const { flags } = this.parse(ImportWorkflowsCommand);
        if (!flags.input) {
            console.info(`An input file or directory with --input must be provided`);
            return;
        }
        if (flags.separate) {
            if (fs.existsSync(flags.input)) {
                if (!fs.lstatSync(flags.input).isDirectory()) {
                    console.info(`The paramenter --input must be a directory`);
                    return;
                }
            }
        }
        try {
            await src_1.Db.init();
            await n8n_core_1.UserSettings.prepareUserSettings();
            let i;
            if (flags.separate) {
                const files = await glob((flags.input.endsWith(path.sep) ? flags.input : flags.input + path.sep) + '*.json');
                for (i = 0; i < files.length; i++) {
                    const workflow = JSON.parse(fs.readFileSync(files[i], { encoding: 'utf8' }));
                    await src_1.Db.collections.Workflow.save(workflow);
                }
            }
            else {
                const fileContents = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));
                if (!Array.isArray(fileContents)) {
                    throw new Error(`File does not seem to contain workflows.`);
                }
                for (i = 0; i < fileContents.length; i++) {
                    await src_1.Db.collections.Workflow.save(fileContents[i]);
                }
            }
            console.info(`Successfully imported ${i} ${i === 1 ? 'workflow.' : 'workflows.'}`);
            process.exit(0);
        }
        catch (error) {
            console.error('An error occurred while exporting workflows. See log messages for details.');
            logger.error(error.message);
            this.exit(1);
        }
    }
}
exports.ImportWorkflowsCommand = ImportWorkflowsCommand;
ImportWorkflowsCommand.description = 'Import workflows';
ImportWorkflowsCommand.examples = [
    `$ n8n import:workflow --input=file.json`,
    `$ n8n import:workflow --separate --input=backups/latest/`,
];
ImportWorkflowsCommand.flags = {
    help: command_1.flags.help({ char: 'h' }),
    input: command_1.flags.string({
        char: 'i',
        description: 'Input file name or directory if --separate is used',
    }),
    separate: command_1.flags.boolean({
        description: 'Imports *.json files from directory provided by --input',
    }),
};
//# sourceMappingURL=workflow.js.map