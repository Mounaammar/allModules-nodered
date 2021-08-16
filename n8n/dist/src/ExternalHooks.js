"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalHooks = void 0;
const _1 = require("./");
const config = require("../config");
class ExternalHooksClass {
    constructor() {
        this.externalHooks = {};
        this.initDidRun = false;
    }
    async init() {
        if (this.initDidRun === true) {
            return;
        }
        await this.loadHooksFiles();
        this.initDidRun = true;
    }
    async reload(externalHooks) {
        this.externalHooks = {};
        if (externalHooks === undefined) {
            await this.loadHooksFiles(true);
        }
        else {
            this.loadHooks(externalHooks);
        }
    }
    async loadHooksFiles(reload = false) {
        const externalHookFiles = config.get('externalHookFiles').split(':');
        for (let hookFilePath of externalHookFiles) {
            hookFilePath = hookFilePath.trim();
            if (hookFilePath !== '') {
                try {
                    if (reload === true) {
                        delete require.cache[require.resolve(hookFilePath)];
                    }
                    const hookFile = require(hookFilePath);
                    this.loadHooks(hookFile);
                }
                catch (error) {
                    throw new Error(`Problem loading external hook file "${hookFilePath}": ${error.message}`);
                }
            }
        }
    }
    loadHooks(hookFileData) {
        for (const resource of Object.keys(hookFileData)) {
            for (const operation of Object.keys(hookFileData[resource])) {
                const hookString = `${resource}.${operation}`;
                if (this.externalHooks[hookString] === undefined) {
                    this.externalHooks[hookString] = [];
                }
                this.externalHooks[hookString].push.apply(this.externalHooks[hookString], hookFileData[resource][operation]);
            }
        }
    }
    async run(hookName, hookParameters) {
        const externalHookFunctions = {
            dbCollections: _1.Db.collections,
        };
        if (this.externalHooks[hookName] === undefined) {
            return;
        }
        for (const externalHookFunction of this.externalHooks[hookName]) {
            await externalHookFunction.apply(externalHookFunctions, hookParameters);
        }
    }
    exists(hookName) {
        return !!this.externalHooks[hookName];
    }
}
let externalHooksInstance;
function ExternalHooks() {
    if (externalHooksInstance === undefined) {
        externalHooksInstance = new ExternalHooksClass();
    }
    return externalHooksInstance;
}
exports.ExternalHooks = ExternalHooks;
//# sourceMappingURL=ExternalHooks.js.map