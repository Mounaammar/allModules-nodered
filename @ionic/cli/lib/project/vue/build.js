"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VueBuildCLI = exports.VueBuildRunner = void 0;
const build_1 = require("../../build");
class VueBuildRunner extends build_1.BuildRunner {
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
            type: 'vue',
        };
    }
    async buildProject(options) {
        const vueScripts = new VueBuildCLI(this.e);
        await vueScripts.build(options);
    }
}
exports.VueBuildRunner = VueBuildRunner;
class VueBuildCLI extends build_1.BuildCLI {
    constructor() {
        super(...arguments);
        this.name = 'Vue CLI Service';
        this.pkg = '@vue/cli-service';
        this.program = 'vue-cli-service';
        this.prefix = 'vue-cli-service';
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
    async buildEnvVars(options) {
        const env = {};
        return { ...await super.buildEnvVars(options), ...env };
    }
}
exports.VueBuildCLI = VueBuildCLI;
