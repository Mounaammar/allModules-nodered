"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialsOverwrites = void 0;
const _1 = require("./");
class CredentialsOverwritesClass {
    constructor() {
        this.credentialTypes = _1.CredentialTypes();
        this.overwriteData = {};
        this.resolvedTypes = [];
    }
    async init(overwriteData) {
        if (overwriteData !== undefined) {
            this.__setData(JSON.parse(JSON.stringify(overwriteData)));
            return;
        }
        const data = await _1.GenericHelpers.getConfigValue('credentials.overwrite.data');
        try {
            const overwriteData = JSON.parse(data);
            this.__setData(overwriteData);
        }
        catch (error) {
            throw new Error(`The credentials-overwrite is not valid JSON.`);
        }
    }
    __setData(overwriteData) {
        this.overwriteData = overwriteData;
        for (const credentialTypeData of this.credentialTypes.getAll()) {
            const type = credentialTypeData.name;
            const overwrites = this.__getExtended(type);
            if (overwrites && Object.keys(overwrites).length) {
                this.overwriteData[type] = overwrites;
            }
        }
    }
    applyOverwrite(type, data) {
        const overwrites = this.get(type);
        if (overwrites === undefined) {
            return data;
        }
        const returnData = JSON.parse(JSON.stringify(data));
        for (const key of Object.keys(overwrites)) {
            if ([null, undefined, ''].includes(returnData[key])) {
                returnData[key] = overwrites[key];
            }
        }
        return returnData;
    }
    __getExtended(type) {
        if (this.resolvedTypes.includes(type)) {
            return this.overwriteData[type];
        }
        const credentialTypeData = this.credentialTypes.getByName(type);
        if (credentialTypeData === undefined) {
            throw new Error(`The credentials of type "${type}" are not known.`);
        }
        if (credentialTypeData.extends === undefined) {
            this.resolvedTypes.push(type);
            return this.overwriteData[type];
        }
        const overwrites = {};
        for (const credentialsTypeName of credentialTypeData.extends) {
            Object.assign(overwrites, this.__getExtended(credentialsTypeName));
        }
        if (this.overwriteData[type] !== undefined) {
            Object.assign(overwrites, this.overwriteData[type]);
        }
        this.resolvedTypes.push(type);
        return overwrites;
    }
    get(type) {
        return this.overwriteData[type];
    }
    getAll() {
        return this.overwriteData;
    }
}
let credentialsOverwritesInstance;
function CredentialsOverwrites() {
    if (credentialsOverwritesInstance === undefined) {
        credentialsOverwritesInstance = new CredentialsOverwritesClass();
    }
    return credentialsOverwritesInstance;
}
exports.CredentialsOverwrites = CredentialsOverwrites;
//# sourceMappingURL=CredentialsOverwrites.js.map