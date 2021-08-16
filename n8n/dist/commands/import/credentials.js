"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportCredentialsCommand = void 0;
const command_1 = require("@oclif/command");
const n8n_core_1 = require("n8n-core");
const src_1 = require("../../src");
const Logger_1 = require("../../src/Logger");
const n8n_workflow_1 = require("n8n-workflow");
const fs = require("fs");
const glob = require("glob-promise");
const path = require("path");
class ImportCredentialsCommand extends command_1.Command {
    async run() {
        const logger = Logger_1.getLogger();
        n8n_workflow_1.LoggerProxy.init(logger);
        const { flags } = this.parse(ImportCredentialsCommand);
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
            const encryptionKey = await n8n_core_1.UserSettings.getEncryptionKey();
            if (encryptionKey === undefined) {
                throw new Error('No encryption key got found to encrypt the credentials!');
            }
            if (flags.separate) {
                const files = await glob((flags.input.endsWith(path.sep) ? flags.input : flags.input + path.sep) + '*.json');
                for (i = 0; i < files.length; i++) {
                    const credential = JSON.parse(fs.readFileSync(files[i], { encoding: 'utf8' }));
                    if (typeof credential.data === 'object') {
                        n8n_core_1.Credentials.prototype.setData.call(credential, credential.data, encryptionKey);
                    }
                    await src_1.Db.collections.Credentials.save(credential);
                }
            }
            else {
                const fileContents = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));
                if (!Array.isArray(fileContents)) {
                    throw new Error(`File does not seem to contain credentials.`);
                }
                for (i = 0; i < fileContents.length; i++) {
                    if (typeof fileContents[i].data === 'object') {
                        n8n_core_1.Credentials.prototype.setData.call(fileContents[i], fileContents[i].data, encryptionKey);
                    }
                    await src_1.Db.collections.Credentials.save(fileContents[i]);
                }
            }
            console.info(`Successfully imported ${i} ${i === 1 ? 'credential.' : 'credentials.'}`);
            process.exit(0);
        }
        catch (error) {
            console.error('An error occurred while exporting credentials. See log messages for details.');
            logger.error(error.message);
            this.exit(1);
        }
    }
}
exports.ImportCredentialsCommand = ImportCredentialsCommand;
ImportCredentialsCommand.description = 'Import credentials';
ImportCredentialsCommand.examples = [
    `$ n8n import:credentials --input=file.json`,
    `$ n8n import:credentials --separate --input=backups/latest/`,
];
ImportCredentialsCommand.flags = {
    help: command_1.flags.help({ char: 'h' }),
    input: command_1.flags.string({
        char: 'i',
        description: 'Input file name or directory if --separate is used',
    }),
    separate: command_1.flags.boolean({
        description: 'Imports *.json files from directory provided by --input',
    }),
};
//# sourceMappingURL=credentials.js.map