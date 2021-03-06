"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringNamespace = void 0;
const namespace_1 = require("../../lib/namespace");
class MonitoringNamespace extends namespace_1.Namespace {
    async getMetadata() {
        const groups = [];
        if (!this.project || this.project.type !== 'ionic-angular') {
            groups.push("hidden" /* HIDDEN */);
        }
        return {
            name: 'monitoring',
            summary: 'Commands relating to Ionic Appflow Error Monitoring',
            groups,
        };
    }
    async getCommands() {
        return new namespace_1.CommandMap([
            ['syncmaps', async () => { const { MonitoringSyncSourcemapsCommand } = await Promise.resolve().then(() => require('./syncmaps')); return new MonitoringSyncSourcemapsCommand(this); }],
        ]);
    }
}
exports.MonitoringNamespace = MonitoringNamespace;
