"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHGenerateCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const utils_fs_1 = require("@ionic/utils-fs");
const utils_terminal_1 = require("@ionic/utils-terminal");
const path = require("path");
const color_1 = require("../../lib/color");
const base_1 = require("./base");
const SSH_KEY_TYPES = ['ecdsa', 'ed25519', 'rsa'];
class SSHGenerateCommand extends base_1.SSHBaseCommand {
    async getMetadata() {
        return {
            name: 'generate',
            type: 'global',
            summary: 'Generates a private and public SSH key pair',
            inputs: [
                {
                    name: 'key-path',
                    summary: 'Destination of private key file',
                },
            ],
            options: [
                {
                    name: 'type',
                    summary: `The type of key to generate: ${SSH_KEY_TYPES.map(v => color_1.input(v)).join(', ')}`,
                    default: 'rsa',
                    aliases: ['t'],
                    groups: ["advanced" /* ADVANCED */],
                },
                {
                    name: 'bits',
                    summary: 'Number of bits in the key',
                    aliases: ['b'],
                    default: '2048',
                    groups: ["advanced" /* ADVANCED */],
                },
                {
                    name: 'annotation',
                    summary: 'Annotation (comment) in public key. Your Ionic email address will be used',
                    aliases: ['C'],
                    groups: ["advanced" /* ADVANCED */],
                },
            ],
        };
    }
    async preRun(inputs, options) {
        await this.checkForOpenSSH();
        await this.env.session.getUserToken();
        if (!options['annotation']) {
            options['annotation'] = this.env.config.get('user.email');
        }
        cli_framework_1.validate(String(options['type']), 'type', [cli_framework_1.contains(SSH_KEY_TYPES, { caseSensitive: false })]);
    }
    async run(inputs, options) {
        const { getGeneratedPrivateKeyPath } = await Promise.resolve().then(() => require('../../lib/ssh'));
        const { bits, annotation } = options;
        const keyPath = inputs[0] ? utils_terminal_1.expandPath(String(inputs[0])) : await getGeneratedPrivateKeyPath(this.env.config.get('user.id'));
        const keyPathDir = path.dirname(keyPath);
        const pubkeyPath = `${keyPath}.pub`;
        if (!(await utils_fs_1.pathExists(keyPathDir))) {
            await utils_fs_1.mkdirp(keyPathDir, 0o700);
            this.env.log.msg(`Created ${color_1.strong(utils_terminal_1.prettyPath(keyPathDir))} directory for you.`);
        }
        if (await utils_fs_1.pathExists(keyPath)) {
            const confirm = await this.env.prompt({
                type: 'confirm',
                name: 'confirm',
                message: `Key ${color_1.strong(utils_terminal_1.prettyPath(keyPath))} exists. Overwrite?`,
            });
            if (confirm) {
                await utils_fs_1.unlink(keyPath);
            }
            else {
                this.env.log.msg(`Not overwriting ${color_1.strong(utils_terminal_1.prettyPath(keyPath))}.`);
                return;
            }
        }
        this.env.log.info('Enter a passphrase for your private key.\n' +
            `You will be prompted to provide a ${color_1.strong('passphrase')}, which is used to protect your private key should you lose it. (If someone has your private key, they can impersonate you!) Passphrases are recommended, but not required.\n`);
        await this.env.shell.run('ssh-keygen', ['-q', '-t', String(options['type']), '-b', String(bits), '-C', String(annotation), '-f', keyPath], { stdio: 'inherit', showCommand: false, showError: false });
        this.env.log.nl();
        this.env.log.rawmsg(`Private Key (${color_1.strong(utils_terminal_1.prettyPath(keyPath))}): Keep this safe!\n` +
            `Public Key (${color_1.strong(utils_terminal_1.prettyPath(pubkeyPath))}): Give this to all your friends!\n\n`);
        this.env.log.ok('A new pair of SSH keys has been generated!');
        this.env.log.nl();
        this.env.log.msg(`${color_1.strong('Next steps:')}\n` +
            ` * Add your public key to Ionic: ${color_1.input('ionic ssh add ' + utils_terminal_1.prettyPath(pubkeyPath))}\n` +
            ` * Use your private key for secure communication with Ionic: ${color_1.input('ionic ssh use ' + utils_terminal_1.prettyPath(keyPath))}`);
    }
}
exports.SSHGenerateCommand = SSHGenerateCommand;
