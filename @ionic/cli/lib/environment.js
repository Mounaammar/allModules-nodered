"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
class Environment {
    constructor({ client, config, flags, getInfo, log, ctx, prompt, session, shell }) {
        this.client = client;
        this.config = config;
        this.flags = flags;
        this.getInfo = getInfo;
        this.log = log;
        this.ctx = ctx;
        this.prompt = prompt;
        this.session = session;
        this.shell = shell;
    }
}
exports.Environment = Environment;
