"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomBuildRunner = void 0;
const build_1 = require("../../build");
const color_1 = require("../../color");
const errors_1 = require("../../errors");
class CustomBuildRunner extends build_1.BuildRunner {
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
            type: 'custom',
        };
    }
    async buildProject(options) {
        const cli = this.getPkgManagerBuildCLI();
        if (!await cli.resolveScript()) {
            throw new errors_1.RunnerException(`Cannot perform build.\n` +
                `Since you're using the ${color_1.strong('custom')} project type, you must provide the ${color_1.input(cli.script)} npm script so the Ionic CLI can build your project.`);
        }
        await cli.build(options);
    }
}
exports.CustomBuildRunner = CustomBuildRunner;
