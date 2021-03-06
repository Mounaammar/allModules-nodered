"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployNamespace = void 0;
const color_1 = require("../../lib/color");
const namespace_1 = require("../../lib/namespace");
class DeployNamespace extends namespace_1.Namespace {
    async getMetadata() {
        return {
            name: 'deploy',
            summary: 'Appflow Deploy functionality',
            description: `
These commands integrate with Ionic Appflow to configure the deploy plugin in your project and run remote builds.

Appflow deploy documentation:
- Overview: ${color_1.strong('https://ion.link/appflow-deploy-docs')}
`,
            groups: ["paid" /* PAID */],
        };
    }
    async getCommands() {
        return new namespace_1.CommandMap([
            ['add', async () => { const { AddCommand } = await Promise.resolve().then(() => require('./add')); return new AddCommand(this); }],
            ['configure', async () => { const { ConfigureCommand } = await Promise.resolve().then(() => require('./configure')); return new ConfigureCommand(this); }],
            ['build', async () => { const { BuildCommand } = await Promise.resolve().then(() => require('./build')); return new BuildCommand(this); }],
            ['manifest', async () => { const { DeployManifestCommand } = await Promise.resolve().then(() => require('./manifest')); return new DeployManifestCommand(this); }],
        ]);
    }
}
exports.DeployNamespace = DeployNamespace;
