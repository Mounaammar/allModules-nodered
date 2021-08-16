"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigValueSync = exports.getConfigValue = exports.getVersions = exports.getSessionId = exports.getBaseUrl = void 0;
const config = require("../config");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
let versionCache;
function getBaseUrl() {
    const protocol = config.get('protocol');
    const host = config.get('host');
    const port = config.get('port');
    const path = config.get('path');
    if (protocol === 'http' && port === 80 || protocol === 'https' && port === 443) {
        return `${protocol}://${host}${path}`;
    }
    return `${protocol}://${host}:${port}${path}`;
}
exports.getBaseUrl = getBaseUrl;
function getSessionId(req) {
    return req.headers.sessionid;
}
exports.getSessionId = getSessionId;
async function getVersions() {
    if (versionCache !== undefined) {
        return versionCache;
    }
    const packageFile = await promises_1.readFile(path_1.join(__dirname, '../../package.json'), 'utf8');
    const packageData = JSON.parse(packageFile);
    versionCache = {
        cli: packageData.version,
    };
    return versionCache;
}
exports.getVersions = getVersions;
function extractSchemaForKey(configKey, configSchema) {
    const configKeyParts = configKey.split('.');
    for (const key of configKeyParts) {
        if (configSchema[key] === undefined) {
            throw new Error(`Key "${key}" of ConfigKey "${configKey}" does not exist`);
        }
        else if (configSchema[key]._cvtProperties === undefined) {
            configSchema = configSchema[key];
        }
        else {
            configSchema = configSchema[key]._cvtProperties;
        }
    }
    return configSchema;
}
async function getConfigValue(configKey) {
    const configSchema = config.getSchema();
    const currentSchema = extractSchemaForKey(configKey, configSchema._cvtProperties);
    if (currentSchema.env === undefined) {
        return config.get(configKey);
    }
    const fileEnvironmentVariable = process.env[currentSchema.env + '_FILE'];
    if (fileEnvironmentVariable === undefined) {
        return config.get(configKey);
    }
    let data;
    try {
        data = await promises_1.readFile(fileEnvironmentVariable, 'utf8');
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`The file "${fileEnvironmentVariable}" could not be found.`);
        }
        throw error;
    }
    return data;
}
exports.getConfigValue = getConfigValue;
function getConfigValueSync(configKey) {
    const configSchema = config.getSchema();
    const currentSchema = extractSchemaForKey(configKey, configSchema._cvtProperties);
    if (currentSchema.env === undefined) {
        return config.get(configKey);
    }
    const fileEnvironmentVariable = process.env[currentSchema.env + '_FILE'];
    if (fileEnvironmentVariable === undefined) {
        return config.get(configKey);
    }
    let data;
    try {
        data = fs_1.readFileSync(fileEnvironmentVariable, 'utf8');
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`The file "${fileEnvironmentVariable}" could not be found.`);
        }
        throw error;
    }
    return data;
}
exports.getConfigValueSync = getConfigValueSync;
//# sourceMappingURL=GenericHelpers.js.map