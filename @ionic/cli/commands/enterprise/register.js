"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterCommand = void 0;
const color_1 = require("../../lib/color");
const command_1 = require("../../lib/command");
const errors_1 = require("../../lib/errors");
const executor_1 = require("../../lib/executor");
class RegisterCommand extends command_1.Command {
    async getMetadata() {
        return {
            name: 'register',
            type: 'project',
            groups: ["paid" /* PAID */],
            summary: 'Register your Product Key with this app',
            options: [
                {
                    name: 'app-id',
                    summary: 'The Ionic App ID',
                    spec: {
                        value: 'id',
                    },
                },
                {
                    name: 'key',
                    summary: 'The Product Key',
                },
            ],
        };
    }
    async run(inputs, options, runinfo) {
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input('ionic enterprise register')} outside a project directory.`);
        }
        const appId = options['app-id'] ? String(options['app-id']) : undefined;
        const key = options['key'] ? String(options['key']) : undefined;
        const extra = ['--'];
        if (key) {
            extra.push('--key', key);
        }
        if (appId) {
            extra.push('--app-id', appId);
        }
        await executor_1.runCommand(runinfo, ['integrations', 'enable', 'enterprise', ...extra.length > 1 ? extra : []]);
    }
}
exports.RegisterCommand = RegisterCommand;
