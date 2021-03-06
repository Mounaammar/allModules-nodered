"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IonicAngularGenerateRunner = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const color_1 = require("../../color");
const generate_1 = require("../../generate");
const app_scripts_1 = require("./app-scripts");
const GENERATOR_TYPES = ['component', 'directive', 'page', 'pipe', 'provider', 'tabs'];
class IonicAngularGenerateRunner extends generate_1.GenerateRunner {
    constructor(e) {
        super();
        this.e = e;
    }
    async getCommandMetadata() {
        return {
            groups: [],
            summary: `Generate pipes, components, pages, directives, providers, and tabs`,
            description: `
Automatically create components for your Ionic app.

The given ${color_1.input('name')} is normalized into an appropriate naming convention. For example, ${color_1.input('ionic generate page neat')} creates a page by the name of ${color_1.input('NeatPage')} in ${color_1.input('src/pages/neat/')}.
      `,
            exampleCommands: [
                '',
                ...GENERATOR_TYPES,
                'component foo',
                'page Login',
                'page Detail --no-module',
                'page About --constants',
                'pipe MyFilterPipe',
            ],
            inputs: [
                {
                    name: 'type',
                    summary: `The type of generator (e.g. ${GENERATOR_TYPES.map(t => color_1.input(t)).join(', ')})`,
                    validators: [cli_framework_1.validators.required, cli_framework_1.contains(GENERATOR_TYPES, {})],
                },
                {
                    name: 'name',
                    summary: 'The name of the component being generated',
                    validators: [cli_framework_1.validators.required],
                },
            ],
            options: [
                {
                    name: 'module',
                    summary: 'Do not generate an NgModule for the page',
                    hint: color_1.weak('[page]'),
                    type: Boolean,
                    default: true,
                },
                {
                    name: 'constants',
                    summary: 'Generate a page constant file for lazy-loaded pages',
                    hint: color_1.weak('[page]'),
                    type: Boolean,
                    default: false,
                },
            ],
        };
    }
    async ensureCommandLine(inputs, options) {
        if (!inputs[0]) {
            const generatorType = await this.e.prompt({
                type: 'list',
                name: 'generatorType',
                message: 'What would you like to generate:',
                choices: GENERATOR_TYPES,
            });
            inputs[0] = generatorType;
        }
        if (!inputs[1]) {
            const generatorName = await this.e.prompt({
                type: 'input',
                name: 'generatorName',
                message: 'What should the name be?',
                validate: v => cli_framework_1.validators.required(v),
            });
            inputs[1] = generatorName;
        }
    }
    createOptionsFromCommandLine(inputs, options) {
        const baseOptions = super.createOptionsFromCommandLine(inputs, options);
        return {
            ...baseOptions,
            module: options['module'] ? true : false,
            constants: options['constants'] ? true : false,
        };
    }
    async run(options) {
        const AppScripts = await app_scripts_1.importAppScripts(this.e.project.directory);
        const appScriptsArgs = cli_framework_1.unparseArgs({ _: [], module: options.module, constants: options.constants }, { useEquals: false, ignoreFalse: true, allowCamelCase: true });
        AppScripts.setProcessArgs(['node', 'appscripts'].concat(appScriptsArgs));
        AppScripts.setCwd(this.e.project.directory);
        const context = AppScripts.generateContext();
        switch (options.type) {
            case 'page':
                await AppScripts.processPageRequest(context, options.name, options);
                break;
            case 'component':
                const componentData = await this.getModules(context, 'component');
                await AppScripts.processComponentRequest(context, options.name, componentData);
                break;
            case 'directive':
                const directiveData = await this.getModules(context, 'directive');
                await AppScripts.processDirectiveRequest(context, options.name, directiveData);
                break;
            case 'pipe':
                const pipeData = await this.getModules(context, 'pipe');
                await AppScripts.processPipeRequest(context, options.name, pipeData);
                break;
            case 'provider':
                const providerData = context.appNgModulePath;
                await AppScripts.processProviderRequest(context, options.name, providerData);
                break;
            case 'tabs':
                const tabsData = await this.tabsPrompt();
                await AppScripts.processTabsRequest(context, options.name, tabsData, options);
                break;
        }
        this.e.log.ok(`Generated a ${color_1.strong(options.type)}${options.type === 'tabs' ? ' page' : ''} named ${color_1.strong(options.name)}!`);
    }
    async tabsPrompt() {
        const tabNames = [];
        const howMany = await this.e.prompt({
            type: 'input',
            name: 'howMany',
            message: 'How many tabs?',
            validate: v => cli_framework_1.validators.numeric(v),
        });
        for (let i = 0; i < parseInt(howMany, 10); i++) {
            const tabName = await this.e.prompt({
                type: 'input',
                name: 'tabName',
                message: 'Name of this tab:',
            });
            tabNames.push(tabName);
        }
        return tabNames;
    }
    async getModules(context, kind) {
        switch (kind) {
            case 'component':
                return context.componentsNgModulePath ? context.componentsNgModulePath : context.appNgModulePath;
            case 'pipe':
                return context.pipesNgModulePath ? context.pipesNgModulePath : context.appNgModulePath;
            case 'directive':
                return context.directivesNgModulePath ? context.directivesNgModulePath : context.appNgModulePath;
        }
    }
}
exports.IonicAngularGenerateRunner = IonicAngularGenerateRunner;
