"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageNamespace = void 0;
const color_1 = require("../../lib/color");
const namespace_1 = require("../../lib/namespace");
class PackageNamespace extends namespace_1.Namespace {
    async getMetadata() {
        return {
            name: 'package',
            summary: 'Appflow package functionality',
            description: `
Interface to execute commands about package builds and deployments on Ionic Appflow.

Appflow package documentation:
- Overview: ${color_1.strong('https://ion.link/appflow-package-docs')}
      `,
            groups: ["paid" /* PAID */],
        };
    }
    async getCommands() {
        return new namespace_1.CommandMap([
            ['build', async () => { const { BuildCommand } = await Promise.resolve().then(() => require('./build')); return new BuildCommand(this); }],
            ['deploy', async () => { const { DeployCommand } = await Promise.resolve().then(() => require('./deploy')); return new DeployCommand(this); }],
        ]);
    }
}
exports.PackageNamespace = PackageNamespace;
