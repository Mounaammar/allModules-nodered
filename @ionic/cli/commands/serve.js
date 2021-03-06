"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabCommand = exports.ServeCommand = void 0;
const utils_process_1 = require("@ionic/utils-process");
const lodash = require("lodash");
const color_1 = require("../lib/color");
const command_1 = require("../lib/command");
const errors_1 = require("../lib/errors");
const executor_1 = require("../lib/executor");
const serve_1 = require("../lib/serve");
class ServeCommand extends command_1.Command {
    async getMetadata() {
        const groups = [];
        let options = [
            ...serve_1.COMMON_SERVE_COMMAND_OPTIONS,
            {
                name: 'lab-host',
                summary: 'Use specific host for Ionic Lab server',
                default: 'localhost',
                groups: ["advanced" /* ADVANCED */],
                spec: { value: 'host' },
                hint: color_1.weak('(--lab)'),
            },
            {
                name: 'lab-port',
                summary: 'Use specific port for Ionic Lab server',
                default: serve_1.DEFAULT_LAB_PORT.toString(),
                groups: ["advanced" /* ADVANCED */],
                spec: { value: 'port' },
                hint: color_1.weak('(--lab)'),
            },
            {
                name: 'open',
                summary: 'Do not open a browser window',
                type: Boolean,
                default: true,
            },
            {
                name: 'browser',
                summary: `Specifies the browser to use (${serve_1.BROWSERS.map(b => color_1.input(b)).join(', ')})`,
                aliases: ['w'],
                groups: ["advanced" /* ADVANCED */],
            },
            {
                name: 'browseroption',
                summary: `Specifies a path to open to (${color_1.input('/#/tab/dash')})`,
                aliases: ['o'],
                groups: ["advanced" /* ADVANCED */],
                spec: { value: 'path' },
            },
            {
                name: 'lab',
                summary: 'Test your apps on multiple platform types in the browser',
                type: Boolean,
                aliases: ['l'],
            },
        ];
        const exampleCommands = ['', '--external', '--lab'];
        const footnotes = [];
        let description = `
Easily spin up a development server which launches in your browser. It watches for changes in your source files and automatically reloads with the updated build.

By default, ${color_1.input('ionic serve')} boots up a development server on ${color_1.input('localhost')}. To serve to your LAN, specify the ${color_1.input('--external')} option, which will use all network interfaces and print the external address(es) on which your app is being served.

Try the ${color_1.input('--lab')} option to see multiple platforms at once.`;
        const runner = this.project && await this.project.getServeRunner();
        if (runner) {
            const libmetadata = await runner.getCommandMetadata();
            groups.push(...libmetadata.groups || []);
            options = lodash.uniqWith([...libmetadata.options || [], ...options], (optionA, optionB) => optionA.name === optionB.name);
            description += `\n\n${(libmetadata.description || '').trim()}`;
            footnotes.push(...libmetadata.footnotes || []);
            exampleCommands.push(...libmetadata.exampleCommands || []);
        }
        return {
            name: 'serve',
            type: 'project',
            summary: 'Start a local dev server for app dev/testing',
            description,
            footnotes,
            groups,
            exampleCommands,
            options,
        };
    }
    async preRun(inputs, options, { location }) {
        const parts = executor_1.getFullCommandParts(location);
        const alias = lodash.last(parts);
        if (alias === 'lab') {
            options['lab'] = true;
        }
        if (options['nolivereload']) {
            this.env.log.warn(`The ${color_1.input('--nolivereload')} option has been deprecated. Please use ${color_1.input('--no-livereload')}.`);
            options['livereload'] = false;
        }
        if (options['nobrowser']) {
            this.env.log.warn(`The ${color_1.input('--nobrowser')} option has been deprecated. Please use ${color_1.input('--no-open')}.`);
            options['open'] = false;
        }
        if (options['b']) {
            options['open'] = false;
        }
        if (options['noproxy']) {
            this.env.log.warn(`The ${color_1.input('--noproxy')} option has been deprecated. Please use ${color_1.input('--no-proxy')}.`);
            options['proxy'] = false;
        }
        if (options['x']) {
            options['proxy'] = false;
        }
    }
    async run(inputs, options, runinfo) {
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input('ionic serve')} outside a project directory.`);
        }
        try {
            const runner = await this.project.requireServeRunner();
            const runnerOpts = runner.createOptionsFromCommandLine(inputs, options);
            await runner.run(runnerOpts);
        }
        catch (e) {
            if (e instanceof errors_1.RunnerException) {
                throw new errors_1.FatalException(e.message);
            }
            throw e;
        }
        await utils_process_1.sleepForever();
    }
}
exports.ServeCommand = ServeCommand;
class LabCommand extends ServeCommand {
    async getMetadata() {
        const metadata = await super.getMetadata();
        const groups = [...metadata.groups || [], "hidden" /* HIDDEN */];
        const exampleCommands = [...metadata.exampleCommands || []].filter(c => !c.includes('--lab'));
        return {
            ...metadata,
            summary: 'Start Ionic Lab for multi-platform dev/testing',
            description: `
Start an instance of ${color_1.strong('Ionic Lab')}, a tool for developing Ionic apps for multiple platforms at once side-by-side.

${color_1.input('ionic lab')} is just a convenient shortcut for ${color_1.input('ionic serve --lab')}.`,
            groups,
            exampleCommands,
        };
    }
}
exports.LabCommand = LabCommand;
