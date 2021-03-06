"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSLNamespace = void 0;
const color_1 = require("../../lib/color");
const namespace_1 = require("../../lib/namespace");
class SSLNamespace extends namespace_1.Namespace {
    async getMetadata() {
        return {
            name: 'ssl',
            summary: 'Commands for managing SSL keys & certificates',
            groups: ["experimental" /* EXPERIMENTAL */],
            description: `
These commands make it easy to manage SSL certificates for using HTTPS with ${color_1.input('ionic serve')}.
      `,
        };
    }
    async getCommands() {
        return new namespace_1.CommandMap([
            ['generate', async () => { const { SSLGenerateCommand } = await Promise.resolve().then(() => require('./generate')); return new SSLGenerateCommand(this); }],
            ['g', 'generate'],
        ]);
    }
}
exports.SSLNamespace = SSLNamespace;
