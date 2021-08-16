"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialsHelper = void 0;
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const _1 = require("./");
const mockNodeTypes = {
    nodeTypes: {},
    init: async (nodeTypes) => { },
    getAll: () => {
        return [];
    },
    getByName: (nodeType) => {
        return undefined;
    },
};
class CredentialsHelper extends n8n_workflow_1.ICredentialsHelper {
    getCredentials(name, type) {
        if (!this.workflowCredentials[type]) {
            throw new Error(`No credentials of type "${type}" exist.`);
        }
        if (!this.workflowCredentials[type][name]) {
            throw new Error(`No credentials with name "${name}" exist for type "${type}".`);
        }
        const credentialData = this.workflowCredentials[type][name];
        return new n8n_core_1.Credentials(credentialData.name, credentialData.type, credentialData.nodesAccess, credentialData.data);
    }
    getCredentialsProperties(type) {
        const credentialTypes = _1.CredentialTypes();
        const credentialTypeData = credentialTypes.getByName(type);
        if (credentialTypeData === undefined) {
            throw new Error(`The credentials of type "${type}" are not known.`);
        }
        if (credentialTypeData.extends === undefined) {
            return credentialTypeData.properties;
        }
        const combineProperties = [];
        for (const credentialsTypeName of credentialTypeData.extends) {
            const mergeCredentialProperties = this.getCredentialsProperties(credentialsTypeName);
            n8n_workflow_1.NodeHelpers.mergeNodeProperties(combineProperties, mergeCredentialProperties);
        }
        n8n_workflow_1.NodeHelpers.mergeNodeProperties(combineProperties, credentialTypeData.properties);
        return combineProperties;
    }
    getDecrypted(name, type, mode, raw, expressionResolveValues) {
        const credentials = this.getCredentials(name, type);
        const decryptedDataOriginal = credentials.getData(this.encryptionKey);
        if (raw === true) {
            return decryptedDataOriginal;
        }
        return this.applyDefaultsAndOverwrites(decryptedDataOriginal, type, mode, expressionResolveValues);
    }
    applyDefaultsAndOverwrites(decryptedDataOriginal, type, mode, expressionResolveValues) {
        const credentialsProperties = this.getCredentialsProperties(type);
        let decryptedData = n8n_workflow_1.NodeHelpers.getNodeParameters(credentialsProperties, decryptedDataOriginal, true, false);
        if (decryptedDataOriginal.oauthTokenData !== undefined) {
            decryptedData.oauthTokenData = decryptedDataOriginal.oauthTokenData;
        }
        if (expressionResolveValues) {
            try {
                const workflow = new n8n_workflow_1.Workflow({ nodes: Object.values(expressionResolveValues.workflow.nodes), connections: expressionResolveValues.workflow.connectionsBySourceNode, active: false, nodeTypes: expressionResolveValues.workflow.nodeTypes });
                decryptedData = workflow.expression.getParameterValue(decryptedData, expressionResolveValues.runExecutionData, expressionResolveValues.runIndex, expressionResolveValues.itemIndex, expressionResolveValues.node.name, expressionResolveValues.connectionInputData, mode, false, decryptedData);
            }
            catch (e) {
                e.message += ' [Error resolving credentials]';
                throw e;
            }
        }
        else {
            const node = {
                name: '',
                typeVersion: 1,
                type: 'mock',
                position: [0, 0],
                parameters: {},
            };
            const workflow = new n8n_workflow_1.Workflow({ nodes: [node], connections: {}, active: false, nodeTypes: mockNodeTypes });
            decryptedData = workflow.expression.getComplexParameterValue(node, decryptedData, mode, undefined, decryptedData);
        }
        const credentialsOverwrites = _1.CredentialsOverwrites();
        return credentialsOverwrites.applyOverwrite(type, decryptedData);
    }
    async updateCredentials(name, type, data) {
        const credentials = await this.getCredentials(name, type);
        if (_1.Db.collections.Credentials === null) {
            await _1.Db.init();
        }
        credentials.setData(data, this.encryptionKey);
        const newCredentialsData = credentials.getDataToSave();
        newCredentialsData.updatedAt = new Date();
        const findQuery = {
            name,
            type,
        };
        await _1.Db.collections.Credentials.update(findQuery, newCredentialsData);
    }
}
exports.CredentialsHelper = CredentialsHelper;
//# sourceMappingURL=CredentialsHelper.js.map