"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHNamespace = void 0;
const color_1 = require("../../lib/color");
const namespace_1 = require("../../lib/namespace");
class SSHNamespace extends namespace_1.Namespace {
    async getMetadata() {
        const dashUrl = this.env.config.getDashUrl();
        return {
            name: 'ssh',
            summary: 'Commands for configuring SSH keys',
            description: `
These commands help automate your SSH configuration for Ionic. As an alternative, SSH configuration can be done entirely manually by visiting your Personal Settings[^dashboard-settings-ssh-keys].

To begin, run ${color_1.input('ionic ssh setup')}, which lets you use existing keys or generate new ones just for Ionic.
      `,
            footnotes: [
                {
                    id: 'dashboard-settings-ssh-keys',
                    url: `${dashUrl}/settings/ssh-keys`,
                },
            ],
        };
    }
    async getCommands() {
        return new namespace_1.CommandMap([
            ['generate', async () => { const { SSHGenerateCommand } = await Promise.resolve().then(() => require('./generate')); return new SSHGenerateCommand(this); }],
            ['use', async () => { const { SSHUseCommand } = await Promise.resolve().then(() => require('./use')); return new SSHUseCommand(this); }],
            ['add', async () => { const { SSHAddCommand } = await Promise.resolve().then(() => require('./add')); return new SSHAddCommand(this); }],
            ['delete', async () => { const { SSHDeleteCommand } = await Promise.resolve().then(() => require('./delete')); return new SSHDeleteCommand(this); }],
            ['list', async () => { const { SSHListCommand } = await Promise.resolve().then(() => require('./list')); return new SSHListCommand(this); }],
            ['setup', async () => { const { SSHSetupCommand } = await Promise.resolve().then(() => require('./setup')); return new SSHSetupCommand(this); }],
            ['ls', 'list'],
            ['remove', 'delete'],
            ['rm', 'delete'],
            ['g', 'generate'],
        ]);
    }
}
exports.SSHNamespace = SSHNamespace;
