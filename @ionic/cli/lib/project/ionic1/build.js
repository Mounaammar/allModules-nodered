"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ionic1BuildRunner = void 0;
const build_1 = require("../../build");
class Ionic1BuildRunner extends build_1.BuildRunner {
    constructor(e) {
        super();
        this.e = e;
    }
    async getCommandMetadata() {
        return {};
    }
    createOptionsFromCommandLine(inputs, options) {
        const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);
        return {
            ...baseOptions,
            type: 'ionic1',
        };
    }
    async buildProject(options) {
        const v1 = new Ionic1BuildCLI(this.e);
        await v1.build(options);
    }
}
exports.Ionic1BuildRunner = Ionic1BuildRunner;
class Ionic1BuildCLI extends build_1.BuildCLI {
    constructor() {
        super(...arguments);
        this.name = 'Ionic 1 Toolkit';
        this.pkg = '@ionic/v1-toolkit';
        this.program = 'ionic-v1';
        this.prefix = 'v1';
        this.script = build_1.BUILD_SCRIPT;
    }
    async buildArgs(options) {
        const { pkgManagerArgs } = await Promise.resolve().then(() => require('../../utils/npm'));
        if (this.resolvedProgram === this.program) {
            return ['build'];
        }
        else {
            const [, ...pkgArgs] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script });
            return pkgArgs;
        }
    }
}
