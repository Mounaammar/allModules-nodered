"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AilmentRegistry = exports.Ailment = void 0;
const Debug = require("debug");
class Ailment {
    constructor({ client, config, log, project, shell, session }) {
        this.projects = undefined;
        this.implicit = true;
        this.client = client;
        this.config = config;
        this.log = log;
        this.project = project;
        this.shell = shell;
        this.session = session;
    }
    get debug() {
        if (!this._debug) {
            this._debug = Debug(`ionic:lib:doctor:ailments:${this.id}`);
        }
        return this._debug;
    }
    async getLocalPackageJson(pkgName) {
        try {
            return await this.project.requirePackageJson(pkgName);
        }
        catch (e) {
            if (e.fatal) {
                throw e;
            }
        }
    }
}
exports.Ailment = Ailment;
class AilmentRegistry {
    constructor() {
        this._ailments = [];
    }
    register(ailment) {
        this._ailments.push(ailment);
    }
    get ailments() {
        return this._ailments;
    }
    get(id) {
        return this._ailments.find(a => a.id === id);
    }
}
exports.AilmentRegistry = AilmentRegistry;
