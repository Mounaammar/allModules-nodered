"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialTypes = void 0;
const _1 = require("./");
class CredentialTypesClass {
    constructor() {
        this.credentialTypes = {};
    }
    async init(credentialTypes) {
        this.credentialTypes = credentialTypes;
        const credentialsOverwrites = _1.CredentialsOverwrites().getAll();
        for (const credentialType of Object.keys(credentialsOverwrites)) {
            if (credentialTypes[credentialType] === undefined) {
                continue;
            }
            credentialTypes[credentialType].__overwrittenProperties = Object.keys(credentialsOverwrites[credentialType]);
        }
    }
    getAll() {
        return Object.values(this.credentialTypes);
    }
    getByName(credentialType) {
        return this.credentialTypes[credentialType];
    }
}
let credentialTypesInstance;
function CredentialTypes() {
    if (credentialTypesInstance === undefined) {
        credentialTypesInstance = new CredentialTypesClass();
    }
    return credentialTypesInstance;
}
exports.CredentialTypes = CredentialTypes;
//# sourceMappingURL=CredentialTypes.js.map