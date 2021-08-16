"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadNodesAndCredentials = void 0;
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const config = require("../config");
const Logger_1 = require("../src/Logger");
const promises_1 = require("fs/promises");
const glob = require("glob-promise");
const path = require("path");
const CUSTOM_NODES_CATEGORY = 'Custom Nodes';
class LoadNodesAndCredentialsClass {
    constructor() {
        this.nodeTypes = {};
        this.credentialTypes = {};
        this.excludeNodes = undefined;
        this.includeNodes = undefined;
        this.nodeModulesPath = '';
    }
    async init() {
        this.logger = Logger_1.getLogger();
        n8n_workflow_1.LoggerProxy.init(this.logger);
        const checkPaths = [
            path.join(__dirname, '..', '..', '..', 'n8n-workflow'),
            path.join(__dirname, '..', '..', 'node_modules', 'n8n-workflow'),
        ];
        for (const checkPath of checkPaths) {
            try {
                await promises_1.access(checkPath);
                this.nodeModulesPath = path.dirname(checkPath);
                break;
            }
            catch (error) {
                continue;
            }
        }
        if (this.nodeModulesPath === '') {
            throw new Error('Could not find "node_modules" folder!');
        }
        this.excludeNodes = config.get('nodes.exclude');
        this.includeNodes = config.get('nodes.include');
        const packages = await this.getN8nNodePackages();
        for (const packageName of packages) {
            await this.loadDataFromPackage(packageName);
        }
        const customDirectories = [];
        customDirectories.push(n8n_core_1.UserSettings.getUserN8nFolderCustomExtensionPath());
        if (process.env[n8n_core_1.CUSTOM_EXTENSION_ENV] !== undefined) {
            const customExtensionFolders = process.env[n8n_core_1.CUSTOM_EXTENSION_ENV].split(';');
            customDirectories.push.apply(customDirectories, customExtensionFolders);
        }
        for (const directory of customDirectories) {
            await this.loadDataFromDirectory('CUSTOM', directory);
        }
    }
    async getN8nNodePackages() {
        const getN8nNodePackagesRecursive = async (relativePath) => {
            const results = [];
            const nodeModulesPath = `${this.nodeModulesPath}/${relativePath}`;
            for (const file of await promises_1.readdir(nodeModulesPath)) {
                const isN8nNodesPackage = file.indexOf('n8n-nodes-') === 0;
                const isNpmScopedPackage = file.indexOf('@') === 0;
                if (!isN8nNodesPackage && !isNpmScopedPackage) {
                    continue;
                }
                if (!(await promises_1.stat(nodeModulesPath)).isDirectory()) {
                    continue;
                }
                if (isN8nNodesPackage) {
                    results.push(`${relativePath}${file}`);
                }
                if (isNpmScopedPackage) {
                    results.push(...await getN8nNodePackagesRecursive(`${relativePath}${file}/`));
                }
            }
            return results;
        };
        return getN8nNodePackagesRecursive('');
    }
    async loadCredentialsFromFile(credentialName, filePath) {
        const tempModule = require(filePath);
        let tempCredential;
        try {
            tempCredential = new tempModule[credentialName]();
        }
        catch (e) {
            if (e instanceof TypeError) {
                throw new Error(`Class with name "${credentialName}" could not be found. Please check if the class is named correctly!`);
            }
            else {
                throw e;
            }
        }
        this.credentialTypes[tempCredential.name] = tempCredential;
    }
    async loadNodeFromFile(packageName, nodeName, filePath) {
        let tempNode;
        let fullNodeName;
        const tempModule = require(filePath);
        try {
            tempNode = new tempModule[nodeName]();
            this.addCodex({ node: tempNode, filePath, isCustom: packageName === 'CUSTOM' });
        }
        catch (error) {
            console.error(`Error loading node "${nodeName}" from: "${filePath}"`);
            throw error;
        }
        fullNodeName = packageName + '.' + tempNode.description.name;
        tempNode.description.name = fullNodeName;
        if (tempNode.description.icon !== undefined &&
            tempNode.description.icon.startsWith('file:')) {
            tempNode.description.icon = 'file:' + path.join(path.dirname(filePath), tempNode.description.icon.substr(5));
        }
        if (tempNode.executeSingle) {
            this.logger.warn(`"executeSingle" will get deprecated soon. Please update the code of node "${packageName}.${nodeName}" to use "execute" instead!`, { filePath });
        }
        if (this.includeNodes !== undefined && !this.includeNodes.includes(fullNodeName)) {
            return;
        }
        if (this.excludeNodes !== undefined && this.excludeNodes.includes(fullNodeName)) {
            return;
        }
        this.nodeTypes[fullNodeName] = {
            type: tempNode,
            sourcePath: filePath,
        };
    }
    getCodex(filePath) {
        const { categories, subcategories, alias } = require(`${filePath}on`);
        return Object.assign(Object.assign(Object.assign({}, (categories && { categories })), (subcategories && { subcategories })), (alias && { alias }));
    }
    addCodex({ node, filePath, isCustom }) {
        try {
            const codex = this.getCodex(filePath);
            if (isCustom) {
                codex.categories = codex.categories
                    ? codex.categories.concat(CUSTOM_NODES_CATEGORY)
                    : [CUSTOM_NODES_CATEGORY];
            }
            node.description.codex = codex;
        }
        catch (_) {
            this.logger.debug(`No codex available for: ${filePath.split('/').pop()}`);
            if (isCustom) {
                node.description.codex = {
                    categories: [CUSTOM_NODES_CATEGORY],
                };
            }
        }
    }
    async loadDataFromDirectory(setPackageName, directory) {
        const files = await glob(path.join(directory, '**/*\.@(node|credentials)\.js'));
        let fileName;
        let type;
        const loadPromises = [];
        for (const filePath of files) {
            [fileName, type] = path.parse(filePath).name.split('.');
            if (type === 'node') {
                loadPromises.push(this.loadNodeFromFile(setPackageName, fileName, filePath));
            }
            else if (type === 'credentials') {
                loadPromises.push(this.loadCredentialsFromFile(fileName, filePath));
            }
        }
        await Promise.all(loadPromises);
    }
    async loadDataFromPackage(packageName) {
        const packagePath = path.join(this.nodeModulesPath, packageName);
        const packageFileString = await promises_1.readFile(path.join(packagePath, 'package.json'), 'utf8');
        const packageFile = JSON.parse(packageFileString);
        if (!packageFile.hasOwnProperty('n8n')) {
            return;
        }
        let tempPath, filePath;
        let fileName, type;
        if (packageFile.n8n.hasOwnProperty('nodes') && Array.isArray(packageFile.n8n.nodes)) {
            for (filePath of packageFile.n8n.nodes) {
                tempPath = path.join(packagePath, filePath);
                [fileName, type] = path.parse(filePath).name.split('.');
                await this.loadNodeFromFile(packageName, fileName, tempPath);
            }
        }
        if (packageFile.n8n.hasOwnProperty('credentials') && Array.isArray(packageFile.n8n.credentials)) {
            for (filePath of packageFile.n8n.credentials) {
                tempPath = path.join(packagePath, filePath);
                [fileName, type] = path.parse(filePath).name.split('.');
                this.loadCredentialsFromFile(fileName, tempPath);
            }
        }
    }
}
let packagesInformationInstance;
function LoadNodesAndCredentials() {
    if (packagesInformationInstance === undefined) {
        packagesInformationInstance = new LoadNodesAndCredentialsClass();
    }
    return packagesInformationInstance;
}
exports.LoadNodesAndCredentials = LoadNodesAndCredentials;
//# sourceMappingURL=LoadNodesAndCredentials.js.map