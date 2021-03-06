"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAilmentMessage = void 0;
const guards_1 = require("../../../guards");
const color_1 = require("../../color");
async function formatAilmentMessage(ailment) {
    const treatable = guards_1.isTreatableAilment(ailment);
    return (`${await ailment.getMessage()}\n` +
        `${await formatAilmentSteps(ailment)}\n\n` +
        `${color_1.weak('$')} ${color_1.input(`ionic config set -g doctor.issues.${ailment.id}.ignored true`)} ${color_1.weak('(ignore this issue in the future)')}\n` +
        `${treatable ? `${color_1.weak('$')} ${color_1.input(`ionic doctor treat ${ailment.id}`)} ${color_1.weak('(attempt to fix this issue)')}\n` : ''}`);
}
exports.formatAilmentMessage = formatAilmentMessage;
async function formatAilmentSteps(ailment) {
    const steps = await ailment.getTreatmentSteps();
    if (steps.length === 0) {
        return '';
    }
    const treatable = guards_1.isTreatableAilment(ailment);
    const msg = treatable ? `To fix, the following step(s) need to be taken:` : `To fix, take the following step(s):`;
    return `\n${msg}\n\n${steps.map((step, i) => ` ${color_1.weak(String(i + 1) + ')')} ${step.message}`).join('\n')}`;
}
