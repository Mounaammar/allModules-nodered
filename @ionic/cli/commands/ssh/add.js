"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHAddCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const utils_fs_1 = require("@ionic/utils-fs");
const utils_terminal_1 = require("@ionic/utils-terminal");
const fs = require("fs");
const os = require("os");
const path = require("path");
const guards_1 = require("../../guards");
const color_1 = require("../../lib/color");
const errors_1 = require("../../lib/errors");
const executor_1 = require("../../lib/executor");
const base_1 = require("./base");
class SSHAddCommand extends base_1.SSHBaseCommand {
    async getMetadata() {
        return {
            name: 'add',
            type: 'global',
            summary: 'Add an SSH public key to Ionic',
            inputs: [
                {
                    name: 'pubkey-path',
                    summary: 'Location of public key file to add to Ionic',
                    validators: [cli_framework_1.validators.required],
                },
            ],
            options: [
                {
                    name: 'use',
                    summary: 'Use the newly added key as your default SSH key for Ionic',
                    type: Boolean,
                },
            ],
        };
    }
    async preRun(inputs, options) {
        if (!inputs[0]) {
            const defaultPubkeyPath = path.resolve(os.homedir(), '.ssh', 'id_rsa.pub');
            const defaultPubkeyExists = await utils_fs_1.pathAccessible(defaultPubkeyPath, fs.constants.R_OK);
            const pubkeyPath = await this.env.prompt({
                type: 'input',
                name: 'pubkeyPath',
                message: 'Enter the location to your public key file to upload to Ionic:',
                default: defaultPubkeyExists ? utils_terminal_1.prettyPath(defaultPubkeyPath) : undefined,
            });
            inputs[0] = pubkeyPath;
        }
    }
    async run(inputs, options, runinfo) {
        const { ERROR_SSH_INVALID_PUBKEY, SSHKeyClient, parsePublicKeyFile } = await Promise.resolve().then(() => require('../../lib/ssh'));
        const pubkeyPath = utils_terminal_1.expandPath(inputs[0]);
        const pubkeyName = utils_terminal_1.prettyPath(pubkeyPath);
        let pubkey;
        try {
            [pubkey] = await parsePublicKeyFile(pubkeyPath);
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                throw new errors_1.FatalException(`${color_1.strong(utils_terminal_1.prettyPath(pubkeyPath))} does not appear to exist. Please specify a valid SSH public key.\n` +
                    `If you are having issues, try using ${color_1.input('ionic ssh setup')}.`);
            }
            else if (e === ERROR_SSH_INVALID_PUBKEY) {
                throw new errors_1.FatalException(`${color_1.strong(pubkeyName)} does not appear to be a valid SSH public key. (Not in ${color_1.strong('authorized_keys')} file format.)\n` +
                    `If you are having issues, try using ${color_1.input('ionic ssh setup')}.`);
            }
            throw e;
        }
        const user = this.env.session.getUser();
        const token = await this.env.session.getUserToken();
        const sshkeyClient = new SSHKeyClient({ client: this.env.client, token, user });
        try {
            const key = await sshkeyClient.create({ pubkey });
            this.env.log.ok(`Your public key (${color_1.strong(key.fingerprint)}) has been added to Ionic!`);
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e) && e.response.status === 409) {
                this.env.log.msg('Pubkey already added to Ionic.');
            }
            else {
                throw e;
            }
        }
        if (pubkeyPath.endsWith('.pub')) {
            let confirm = options['use'];
            if (!confirm) {
                confirm = await this.env.prompt({
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Would you like to use this key as your default for Ionic?',
                });
            }
            if (confirm) {
                const keyPath = pubkeyPath.substring(0, pubkeyPath.length - 4); // corresponding private key, theoretically
                const keyExists = await utils_fs_1.pathExists(keyPath);
                if (keyExists) {
                    await executor_1.runCommand(runinfo, ['ssh', 'use', utils_terminal_1.prettyPath(keyPath)]);
                }
                else {
                    this.env.log.error(`SSH key does not exist: ${color_1.strong(utils_terminal_1.prettyPath(keyPath))}.\n` +
                        `Please use ${color_1.input('ionic ssh use')} manually to use the corresponding private key.`);
                }
            }
        }
    }
}
exports.SSHAddCommand = SSHAddCommand;
