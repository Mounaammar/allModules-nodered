"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHUseCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const utils_fs_1 = require("@ionic/utils-fs");
const utils_terminal_1 = require("@ionic/utils-terminal");
const color_1 = require("../../lib/color");
const errors_1 = require("../../lib/errors");
const base_1 = require("./base");
class SSHUseCommand extends base_1.SSHBaseCommand {
    async getMetadata() {
        return {
            name: 'use',
            type: 'global',
            summary: 'Set your active Ionic SSH key',
            description: `
This command modifies the SSH configuration file (${color_1.strong('~/.ssh/config')}) to set an active private key for the ${color_1.strong('git.ionicjs.com')} host. Read more about SSH configuration by running the ${color_1.input('man ssh_config')} command or by visiting online man pages[^ssh-config-docs].

Before making changes, ${color_1.input('ionic ssh use')} will print a diff and ask for permission to write the file.
      `,
            footnotes: [
                {
                    id: 'ssh-config-docs',
                    url: 'https://linux.die.net/man/5/ssh_config',
                },
            ],
            inputs: [
                {
                    name: 'key-path',
                    summary: 'Location of private key file to use',
                    validators: [cli_framework_1.validators.required],
                },
            ],
        };
    }
    async run(inputs, options) {
        const { ERROR_SSH_INVALID_PRIVKEY, ERROR_SSH_MISSING_PRIVKEY, validatePrivateKey } = await Promise.resolve().then(() => require('../../lib/ssh'));
        const { ensureHostAndKeyPath, getConfigPath } = await Promise.resolve().then(() => require('../../lib/ssh-config'));
        const keyPath = utils_terminal_1.expandPath(inputs[0]);
        try {
            await validatePrivateKey(keyPath);
        }
        catch (e) {
            if (e === ERROR_SSH_MISSING_PRIVKEY) {
                throw new errors_1.FatalException(`${color_1.strong(utils_terminal_1.prettyPath(keyPath))} does not appear to exist. Please specify a valid SSH private key.\n` +
                    `If you are having issues, try using ${color_1.input('ionic ssh setup')}.`);
            }
            else if (e === ERROR_SSH_INVALID_PRIVKEY) {
                throw new errors_1.FatalException(`${color_1.strong(utils_terminal_1.prettyPath(keyPath))} does not appear to be a valid SSH private key. (Missing '-----BEGIN RSA PRIVATE KEY-----' header.)\n` +
                    `If you are having issues, try using ${color_1.input('ionic ssh setup')}.`);
            }
            else {
                throw e;
            }
        }
        const { SSHConfig } = await Promise.resolve().then(() => require('../../lib/ssh-config'));
        const sshConfigPath = getConfigPath();
        const text1 = await utils_fs_1.fileToString(sshConfigPath);
        const conf = SSHConfig.parse(text1);
        ensureHostAndKeyPath(conf, { host: this.env.config.getGitHost(), port: this.env.config.getGitPort() }, keyPath);
        const text2 = SSHConfig.stringify(conf);
        if (text1 === text2) {
            this.env.log.msg(`${color_1.strong(utils_terminal_1.prettyPath(keyPath))} is already your active SSH key.`);
            return;
        }
        else {
            const { diffPatch } = await Promise.resolve().then(() => require('../../lib/diff'));
            const diff = await diffPatch(sshConfigPath, text1, text2);
            this.env.log.rawmsg(diff);
            const confirm = await this.env.prompt({
                type: 'confirm',
                name: 'confirm',
                message: `May we make the above change(s) to '${utils_terminal_1.prettyPath(sshConfigPath)}'?`,
            });
            if (!confirm) {
                // TODO: link to docs about manual git setup
                throw new errors_1.FatalException();
            }
        }
        await utils_fs_1.writeFile(sshConfigPath, text2, { encoding: 'utf8', mode: 0o600 });
        this.env.log.ok(`Your active Ionic SSH key has been set to ${color_1.strong(keyPath)}!`);
    }
}
exports.SSHUseCommand = SSHUseCommand;
