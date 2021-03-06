"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openUrl = void 0;
const Debug = require("debug");
const debug = Debug('ionic:lib:open');
async function openUrl(target, options = {}) {
    const o = await Promise.resolve().then(() => require('open'));
    const p = await o(target, { ...options, wait: false, url: true });
    const e = (err) => debug('Error during open: %O', err);
    const n = p.on.bind(p);
    n('error', err => e(err));
}
exports.openUrl = openUrl;
