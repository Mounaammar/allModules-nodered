"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorTreatCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const guards_1 = require("../../guards");
const color_1 = require("../../lib/color");
const errors_1 = require("../../lib/errors");
const base_1 = require("./base");
const ERROR_AILMENT_IGNORED = 'AILMENT_IGNORED';
const ERROR_AILMENT_SKIPPED = 'AILMENT_SKIPPED';
class DoctorTreatCommand extends base_1.DoctorCommand {
    async getMetadata() {
        return {
            name: 'treat',
            type: 'project',
            summary: 'Attempt to fix issues in your Ionic project',
            description: `
This command detects and attempts to fix common issues. Before a fix is attempted, the steps are printed and a confirmation prompt is displayed.

Optionally supply the ${color_1.input('id')} argument to attempt to fix a single issue. Use ${color_1.input('ionic doctor list')} to list all known issues.
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
        const { formatAilmentMessage } = await Promise.resolve().then(() => require('../../lib/doctor'));
        const [id] = inputs;
        if (id) {
            const registry = await this.getRegistry();
            const ailmentIds = registry.ailments.map(a => a.id);
            cli_framework_1.validate(id, 'id', [cli_framework_1.contains(ailmentIds, {})]);
            const ailment = registry.get(id);
            if (!ailment) {
                throw new errors_1.FatalException(`Issue not found by ID: ${color_1.input(id)}`);
            }
            const detected = await ailment.detected();
            if (!detected) {
                this.env.log.ok(`${color_1.input(ailment.id)} does not need fixing as it was not detected.`);
                return;
            }
            if (!guards_1.isTreatableAilment(ailment)) {
                this.env.log.warn(await formatAilmentMessage(ailment));
                throw new errors_1.FatalException(`Issue cannot be fixed automatically: ${color_1.input(ailment.id)}\n` +
                    `Unfortunately the CLI can't automatically fix the specified issue at this time. However, please see the steps above for manually fixing the issue.`);
            }
            if (this.env.config.get(`doctor.issues.${ailment.id}.ignored`)) {
                const confirm = await this.env.prompt({
                    type: 'confirm',
                    name: 'confirm',
                    message: `${color_1.input(ailment.id)} is ignored, are you sure you want to continue?`,
                });
                if (!confirm) {
                    return;
                }
                this.env.config.unset(`doctor.issues.${ailment.id}.ignored`);
            }
            try {
                await this.treatAilment(ailment);
            }
            catch (e) {
                this.handleError(e);
            }
        }
        else {
            const ailments = await this.detectTreatableAilments();
            await this.treatAilments(ailments);
        }
    }
    async treatAilments(ailments) {
        let treatedAilments = 0;
        for (const ailment of ailments) {
            try {
                const treated = await this.treatAilment(ailment);
                if (treated) {
                    treatedAilments += 1;
                }
            }
            catch (e) {
                this.handleError(e);
            }
        }
        this.env.log.info('Doctor Summary\n' +
            `- Detected ${color_1.strong(String(ailments.length))} treatable issue${ailments.length === 1 ? '' : 's'}\n` +
            (treatedAilments > 0 ? `- ${color_1.strong(String(treatedAilments))} ${treatedAilments === 1 ? 'issue was' : 'issues were'} fixed automatically` : ''));
    }
    handleError(e) {
        if (e !== ERROR_AILMENT_SKIPPED && e !== ERROR_AILMENT_IGNORED) {
            if (guards_1.isExitCodeException(e)) {
                this.env.log.error(`Error occurred during automatic fix: ${e.message}`);
            }
            else {
                this.env.log.error(`Error occurred during automatic fix: ${e.stack ? e.stack : e}`);
            }
        }
    }
    async treatAilment(ailment) {
        const { formatAilmentMessage } = await Promise.resolve().then(() => require('../../lib/doctor'));
        const treatmentSteps = await ailment.getTreatmentSteps();
        this.env.log.warn(await formatAilmentMessage(ailment));
        const CHOICE_YES = 'yes';
        const CHOICE_NO = 'no';
        const CHOICE_IGNORE = 'ignore';
        const choice = await this.env.prompt({
            type: 'list',
            name: 'choice',
            message: `Fix automatically?`,
            choices: [
                {
                    name: 'Yes',
                    value: CHOICE_YES,
                },
                {
                    name: 'No',
                    value: CHOICE_NO,
                },
                {
                    name: 'Ignore forever',
                    value: CHOICE_IGNORE,
                },
            ],
        });
        if (choice === CHOICE_YES) {
            for (const i in treatmentSteps) {
                const step = treatmentSteps[i];
                try {
                    await step.treat();
                }
                catch (e) {
                    if (!guards_1.isExitCodeException(e) || e.exitCode > 0) {
                        throw e;
                    }
                }
            }
            return true;
        }
        else if (choice === CHOICE_NO) {
            throw ERROR_AILMENT_SKIPPED;
        }
        else if (choice === CHOICE_IGNORE) {
            this.env.config.set(`doctor.issues.${ailment.id}.ignored`, true);
            throw ERROR_AILMENT_IGNORED;
        }
        return false;
    }
}
exports.DoctorTreatCommand = DoctorTreatCommand;
