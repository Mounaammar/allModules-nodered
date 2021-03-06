"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffPatch = void 0;
const color_1 = require("./color");
async function diffPatch(filename, text1, text2) {
    const JsDiff = await Promise.resolve().then(() => require('diff'));
    return JsDiff.createPatch(filename, text1, text2, '', '').split('\n').map(line => {
        if (line.indexOf('-') === 0 && line.indexOf('---') !== 0) {
            line = color_1.strong(color_1.failure(line));
        }
        else if (line.indexOf('+') === 0 && line.indexOf('+++') !== 0) {
            line = color_1.strong(color_1.input(line));
        }
        return line;
    }).slice(2).join('\n');
}
exports.diffPatch = diffPatch;
