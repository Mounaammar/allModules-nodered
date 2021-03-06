"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ionic1Project = exports.ERROR_INVALID_BOWER_JSON = void 0;
const utils_fs_1 = require("@ionic/utils-fs");
const utils_terminal_1 = require("@ionic/utils-terminal");
const Debug = require("debug");
const lodash = require("lodash");
const path = require("path");
const __1 = require("../");
const color_1 = require("../../color");
const errors_1 = require("../../errors");
const debug = Debug('ionic:lib:project:angular');
exports.ERROR_INVALID_BOWER_JSON = 'INVALID_BOWER_JSON';
function isBowerJson(obj) {
    return obj && typeof obj.name === 'string';
}
async function readBowerJsonFile(p) {
    const bowerJson = await utils_fs_1.readJson(p);
    if (!isBowerJson(bowerJson)) {
        throw exports.ERROR_INVALID_BOWER_JSON;
    }
    return bowerJson;
}
class Ionic1Project extends __1.Project {
    constructor() {
        super(...arguments);
        this.type = 'ionic1';
    }
    async getInfo() {
        const [ionic1Version, [v1ToolkitPkg],] = await (Promise.all([
            this.getFrameworkVersion(),
            this.getPackageJson('@ionic/v1-toolkit'),
        ]));
        return [
            ...(await super.getInfo()),
            {
                group: 'ionic',
                name: 'Ionic Framework',
                key: 'framework',
                value: ionic1Version ? `ionic1 ${ionic1Version}` : 'unknown',
            },
            {
                group: 'ionic',
                name: '@ionic/v1-toolkit',
                value: v1ToolkitPkg ? v1ToolkitPkg.version : 'not installed',
            },
        ];
    }
    async detected() {
        try {
            const bwr = await readBowerJsonFile(path.resolve(this.directory, 'bower.json'));
            const deps = lodash.assign({}, bwr.dependencies, bwr.devDependencies);
            if (typeof deps['ionic'] === 'string') {
                debug(`${color_1.strong('ionic')} detected in ${color_1.strong('bower.json')}`);
                return true;
            }
        }
        catch (e) {
            // ignore
        }
        return false;
    }
    async getSourceDir() {
        return this.getDistDir(); // ionic1's source directory is the dist directory
    }
    async getDocsUrl() {
        return 'https://ion.link/v1-docs';
    }
    // this method search not only package.json
    async getFrameworkVersion() {
        const ionicVersionFilePath = path.resolve(await this.getDistDir(), 'lib', 'ionic', 'version.json'); // TODO
        const bowerJsonPath = path.resolve(this.directory, 'bower.json');
        try {
            try {
                const ionicVersionJson = await utils_fs_1.readJson(ionicVersionFilePath);
                return ionicVersionJson['version'];
            }
            catch (e) {
                const bwr = await this.loadBowerJson();
                const deps = lodash.assign({}, bwr.dependencies, bwr.devDependencies);
                const ionicEntry = deps['ionic'];
                if (!ionicEntry) {
                    return;
                }
                const m = ionicEntry.match(/.+#(.+)/);
                if (m && m[1]) {
                    return m[1];
                }
            }
        }
        catch (e) {
            this.e.log.error(`Error with ${color_1.strong(utils_terminal_1.prettyPath(bowerJsonPath))} file: ${e}`);
        }
    }
    async loadBowerJson() {
        if (!this.bowerJsonFile) {
            const bowerJsonPath = path.resolve(this.directory, 'bower.json');
            try {
                this.bowerJsonFile = await readBowerJsonFile(bowerJsonPath);
            }
            catch (e) {
                if (e instanceof SyntaxError) {
                    throw new errors_1.FatalException(`Could not parse ${color_1.strong('bower.json')}. Is it a valid JSON file?`);
                }
                else if (e === exports.ERROR_INVALID_BOWER_JSON) {
                    throw new errors_1.FatalException(`The ${color_1.strong('bower.json')} file seems malformed.`);
                }
                throw e; // Probably file not found
            }
        }
        return this.bowerJsonFile;
    }
    async requireBuildRunner() {
        const { Ionic1BuildRunner } = await Promise.resolve().then(() => require('./build'));
        const deps = { ...this.e, project: this };
        return new Ionic1BuildRunner(deps);
    }
    async requireServeRunner() {
        const { Ionic1ServeRunner } = await Promise.resolve().then(() => require('./serve'));
        const deps = { ...this.e, project: this };
        return new Ionic1ServeRunner(deps);
    }
    async requireGenerateRunner() {
        throw new errors_1.RunnerNotFoundException('Generators are not supported in Ionic 1 projects.');
    }
}
exports.Ionic1Project = Ionic1Project;
