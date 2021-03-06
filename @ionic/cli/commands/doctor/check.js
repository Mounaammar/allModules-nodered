"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorCheckCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const guards_1 = require("../../guards");
const color_1 = require("../../lib/color");
const errors_1 = require("../../lib/errors");
const base_1 = require("./base");
class DoctorCheckCommand extends base_1.DoctorCommand {
    async getMetadata() {
        return {
            name: 'check',
            type: 'project',
            summary: 'Check the health of your Ionic project',
            description: `
This command detects and prints common issues and suggested steps to fix them.

Some issues can be fixed automatically. See ${color_1.input('ionic doctor treat --help')}.

Optionally supply the ${color_1.input('id')} argument to check a single issue. Use ${color_1.input('ionic doctor list')} to list all known issues.
      `,
            exampleCommands: [
                '',
                'git-not-used',
            ],
            inputs: [
                {
                    name: 'id',
                    summary: 'The issue identifier',
                },
            ],
        };
    }
    async run(inputs, options) {
        const [id] = inputs;
        if (id) {
            const registry = await this.getRegistry();
            const ailmentIds = registry.ailments.map(a => a.id);
            cli_framework_1.validate(id, 'id', [cli_framework_1.contains(ailmentIds, {})]);
            const ailment = registry.get(id);
            if (!ailment) {
                throw new errors_1.FatalException(`Issue not found by ID: ${color_1.input(id)}`);
            }
            await this.checkAilment(ailment);
        }
        else {
            const ailments = await this.detectAilments();
            await this.checkAilments(ailments);
        }
    }
    async checkAilments(ailments) {
        let treatableAilments = 0;
        if (ailments.length > 0) {
            for (const ailment of ailments) {
                if (guards_1.isTreatableAilment(ailment)) {
                    treatableAilments += 1;
                }
                await this.checkAilment(ailment);
            }
        }
        const msg = ('Doctor Summary\n' +
            `- Detected ${color_1.strong(String(ailments.length))} issue${ailments.length === 1 ? '' : 's'}.` +
            `${ailments.length === 0 ? ' Aww yeah! ????' : ''}\n` +
            `- ${color_1.strong(String(treatableAilments))} issue${treatableAilments === 1 ? '' : 's'} can be fixed automatically${treatableAilments > 0 ? ` by running: ${color_1.input('ionic doctor fix')}` : ''}`);
        if (ailments.length > 0) {
            this.env.log.info(msg);
            throw new errors_1.FatalException(''); // exit 1
        }
        else {
            this.env.log.ok(msg);
        }
    }
    async checkAilment(ailment) {
        const { formatAilmentMessage } = await Promise.resolve().then(() => require('../../lib/doctor'));
        if (await ailment.detected()) {
            this.env.log.warn(await formatAilmentMessage(ailment));
        }
        else {
            this.env.log.ok(`${color_1.input(ailment.id)} was not detected.`);
        }
    }
}
exports.DoctorCheckCommand = DoctorCheckCommand;
