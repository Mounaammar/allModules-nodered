"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IonitronCommand = void 0;
const command_1 = require("../lib/command");
class IonitronCommand extends command_1.Command {
    async getMetadata() {
        return {
            name: 'ionitron',
            type: 'global',
            summary: 'Print random ionitron messages',
            options: [
                {
                    name: 'es',
                    summary: 'Print in spanish',
                    type: Boolean,
                },
            ],
            groups: ["hidden" /* HIDDEN */],
        };
    }
    async run(inputs, options) {
        const { getIonitronString, ionitronStatements } = await Promise.resolve().then(() => require('../lib/ionitron'));
        const locale = options['es'] ? 'es' : 'en';
        const localeStatements = ionitronStatements[locale];
        const statement = localeStatements[Math.floor(Math.random() * (localeStatements.length))];
        this.env.log.rawmsg(getIonitronString(statement));
    }
}
exports.IonitronCommand = IonitronCommand;
