"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsNamespace = void 0;
const namespace_1 = require("../../lib/namespace");
class IntegrationsNamespace extends namespace_1.Namespace {
    async getMetadata() {
        return {
            name: 'integrations',
            summary: 'Manage various integrations in your app',
            description: 'Integrations, such as Cordova, can be enabled or disabled in your app with these commands.',
        };
    }
    async getCommands() {
        return new namespace_1.CommandMap([
            ['enable', async () => { const { IntegrationsEnableCommand } = await Promise.resolve().then(() => require('./enable')); return new IntegrationsEnableCommand(this); }],
            ['disable', async () => { const { IntegrationsDisableCommand } = await Promise.resolve().then(() => require('./disable')); return new IntegrationsDisableCommand(this); }],
            ['list', async () => { const { IntegrationsListCommand } = await Promise.resolve().then(() => require('./list')); return new IntegrationsListCommand(this); }],
            ['ls', 'list'],
            ['en', 'enable'],
            ['add', 'enable'],
            ['dis', 'disable'],
            ['delete', 'disable'],
            ['del', 'disable'],
            ['remove', 'disable'],
            ['rm', 'disable'],
        ]);
    }
}
exports.IntegrationsNamespace = IntegrationsNamespace;
