"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IonicAngularBuildCLI = exports.IonicAngularBuildRunner = exports.DEFAULT_BUILD_SCRIPT_VALUE = exports.DEFAULT_PROGRAM = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const Debug = require("debug");
const build_1 = require("../../build");
const color_1 = require("../../color");
const app_scripts_1 = require("./app-scripts");
const debug = Debug('ionic:lib:project:ionic-angular:build');
exports.DEFAULT_PROGRAM = 'ionic-app-scripts';
exports.DEFAULT_BUILD_SCRIPT_VALUE = `${exports.DEFAULT_PROGRAM} build`;
class IonicAngularBuildRunner extends build_1.BuildRunner {
    constructor(e) {
        super();
        this.e = e;
    }
    async getCommandMetadata() {
        return {
            description: `
${color_1.input('ionic build')} uses ${color_1.strong('@ionic/app-scripts')}. See the project's ${color_1.strong('README.md')}[^app-scripts-readme] for documentation. Options not listed below are considered advanced and can be passed to the ${color_1.input('ionic-app-scripts')} CLI using the ${color_1.input('--')} separator after the Ionic CLI arguments. See the examples.
      `,
            footnotes: [
                {
                    id: 'app-scripts-readme',
                    url: 'https://github.com/ionic-team/ionic-app-scripts/blob/master/README.md',
                },
            ],
            options: [
                {
                    name: 'source-map',
                    summary: 'Output sourcemaps',
                    type: Boolean,
                    groups: ["advanced" /* ADVANCED */, 'cordova'],
                    hint: color_1.weak('[app-scripts]'),
                },
                ...app_scripts_1.APP_SCRIPTS_OPTIONS,
            ],
            exampleCommands: [
                '--prod',
            ],
        };
    }
    createOptionsFromCommandLine(inputs, options) {
        const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);
        const sourcemaps = typeof options['source-map'] === 'boolean' ? Boolean(options['source-map']) : undefined;
        return {
            ...baseOptions,
            type: 'ionic-angular',
            prod: options['prod'] ? true : false,
            sourcemaps,
            aot: options['aot'] ? true : false,
            minifyjs: options['minifyjs'] ? true : false,
            minifycss: options['minifycss'] ? true : false,
            optimizejs: options['optimizejs'] ? true : false,
            env: options['env'] ? String(options['env']) : undefined,
        };
    }
    async buildProject(options) {
        const appscripts = new IonicAngularBuildCLI(this.e);
        await appscripts.build(options);
    }
}
exports.IonicAngularBuildRunner = IonicAngularBuildRunner;
class IonicAngularBuildCLI extends build_1.BuildCLI {
    constructor() {
        super(...arguments);
        this.name = 'Ionic App Scripts';
        this.pkg = '@ionic/app-scripts';
        this.program = exports.DEFAULT_PROGRAM;
        this.prefix = 'app-scripts';
        this.script = build_1.BUILD_SCRIPT;
    }
    buildOptionsToAppScriptsArgs(options) {
        const minimistArgs = {
            _: [],
            prod: options.prod ? true : false,
            aot: options.aot ? true : false,
            minifyjs: options.minifyjs ? true : false,
            minifycss: options.minifycss ? true : false,
            optimizejs: options.optimizejs ? true : false,
            generateSourceMap: typeof options.sourcemaps !== 'undefined' ? options.sourcemaps ? 'true' : 'false' : undefined,
            target: options.engine === 'cordova' ? 'cordova' : undefined,
            platform: options.platform,
            env: options.env,
        };
        return [...cli_framework_1.unparseArgs(minimistArgs, { allowCamelCase: true, useEquals: false }), ...options['--']];
    }
    async buildArgs(options) {
        const { pkgManagerArgs } = await Promise.resolve().then(() => require('../../utils/npm'));
        const args = this.buildOptionsToAppScriptsArgs(options);
        if (this.resolvedProgram === this.program) {
            return ['build', ...args];
        }
        else {
            const [, ...pkgArgs] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script, scriptArgs: [...args] });
            return pkgArgs;
        }
    }
    async resolveProgram() {
        if (typeof this.script !== 'undefined') {
            debug(`Looking for ${color_1.ancillary(this.script)} npm script.`);
            const pkg = await this.e.project.requirePackageJson();
            if (pkg.scripts && pkg.scripts[this.script]) {
                if (pkg.scripts[this.script] === exports.DEFAULT_BUILD_SCRIPT_VALUE) {
                    debug(`Found ${color_1.ancillary(this.script)}, but it is the default. Not running.`);
                }
                else {
                    debug(`Using ${color_1.ancillary(this.script)} npm script.`);
                    return this.e.config.get('npmClient');
                }
            }
        }
        return this.program;
    }
}
exports.IonicAngularBuildCLI = IonicAngularBuildCLI;
