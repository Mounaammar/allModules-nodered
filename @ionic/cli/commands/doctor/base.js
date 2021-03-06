"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorCommand = void 0;
const utils_array_1 = require("@ionic/utils-array");
const Debug = require("debug");
const guards_1 = require("../../guards");
const color_1 = require("../../lib/color");
const command_1 = require("../../lib/command");
const errors_1 = require("../../lib/errors");
const debug = Debug('ionic:commands:doctor:base');
class DoctorCommand extends command_1.Command {
    async getRegistry() {
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot use ${color_1.input('ionic doctor')} outside a project directory.`);
        }
        const { AilmentRegistry } = await Promise.resolve().then(() => require('../../lib/doctor'));
        const registry = new AilmentRegistry();
        await this.project.registerAilments(registry);
        return registry;
    }
    async detectAilments() {
        const registry = await this.getRegistry();
        let count = 0;
        const tasks = this.createTaskChain();
        const isLoggedIn = this.env.session.isLoggedIn();
        if (!isLoggedIn) {
            this.env.log.warn(`For best results, please make sure you're logged in to Ionic.\nSome issues can't be detected without authentication. Run:\n\n    ${color_1.input('ionic login')}`);
        }
        const detectTask = tasks.next('Detecting issues');
        const ailments = registry.ailments.filter(ailment => {
            if (this.env.config.get(`doctor.issues.${ailment.id}.ignored`)) {
                debug('Issue %s ignored by config', ailment.id);
                return false;
            }
            if (!ailment.implicit) {
                debug('Issue %s will not be implicitly detected', ailment.id);
                return false;
            }
            return true;
        });
        const detectedAilments = await utils_array_1.concurrentFilter(ailments, async (ailment) => {
            let detected = false;
            try {
                detected = await ailment.detected();
                debug('Detected %s: %s', ailment.id, detected);
            }
            catch (e) {
                this.env.log.error(`Error while checking ${color_1.strong(ailment.id)}:\n` +
                    `${color_1.failure(e.stack ? e.stack : e)}`);
            }
            count++;
            detectTask.msg = `Detecting issues: ${color_1.strong(`${count} / ${ailments.length}`)} complete`;
            return detected;
        });
        detectTask.msg = `Detecting issues: ${color_1.strong(`${ailments.length} / ${ailments.length}`)} complete`;
        tasks.end();
        return detectedAilments;
    }
    async detectTreatableAilments() {
        const ailments = await this.detectAilments();
        return ailments.filter((ailment) => guards_1.isTreatableAilment(ailment));
    }
}
exports.DoctorCommand = DoctorCommand;
