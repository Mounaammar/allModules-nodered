"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseIntegration = exports.IntegrationConfig = exports.INTEGRATION_NAMES = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const path = require("path");
const guards_1 = require("../../guards");
const color_1 = require("../color");
const errors_1 = require("../errors");
var guards_2 = require("../../guards");
Object.defineProperty(exports, "INTEGRATION_NAMES", { enumerable: true, get: function () { return guards_2.INTEGRATION_NAMES; } });
class IntegrationConfig extends cli_framework_1.BaseConfig {
    provideDefaults(c) {
        return {};
    }
}
exports.IntegrationConfig = IntegrationConfig;
class BaseIntegration {
    constructor(e) {
        this.e = e;
    }
    static async createFromName(deps, name) {
        if (guards_1.isIntegrationName(name)) {
            const { Integration } = await Promise.resolve().then(() => require(`./${name}`));
            return new Integration(deps);
        }
        throw new errors_1.IntegrationNotFoundException(`Bad integration name: ${color_1.strong(name)}`); // TODO?
    }
    async getInfo() {
        return [];
    }
    isAdded() {
        return !!this.e.project.config.get('integrations')[this.name];
    }
    isEnabled() {
        const integrationConfig = this.e.project.config.get('integrations')[this.name];
        return !!integrationConfig && integrationConfig.enabled !== false;
    }
    async enable(config) {
        if (config && config.root) {
            this.config.set('root', config.root);
        }
        this.config.unset('enabled');
    }
    async disable() {
        this.config.set('enabled', false);
    }
    async personalize(details) {
        // optionally overwritten by subclasses
    }
    async add(details) {
        const config = details.root !== this.e.project.directory ?
            { root: path.relative(this.e.project.rootDirectory, details.root) } :
            undefined;
        await this.enable(config);
    }
}
exports.BaseIntegration = BaseIntegration;
