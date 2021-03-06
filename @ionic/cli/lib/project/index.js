"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidProjectId = exports.prettyProjectName = exports.Project = exports.MultiProjectConfig = exports.ProjectConfig = exports.createProjectFromDirectory = exports.findProjectDirectory = exports.createProjectFromDetails = exports.ProjectDetails = exports.ProjectDetailsError = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const fn_1 = require("@ionic/cli-framework/utils/fn");
const node_1 = require("@ionic/cli-framework/utils/node");
const utils_fs_1 = require("@ionic/utils-fs");
const utils_terminal_1 = require("@ionic/utils-terminal");
const Debug = require("debug");
const lodash = require("lodash");
const path = require("path");
const constants_1 = require("../../constants");
const guards_1 = require("../../guards");
const color_1 = require("../color");
const errors_1 = require("../errors");
const integrations_1 = require("../integrations");
const color_2 = require("../utils/color");
const debug = Debug('ionic:lib:project');
class ProjectDetailsError extends errors_1.BaseException {
    constructor(msg, 
    /**
     * Unique code for this error.
     */
    code, 
    /**
     * The underlying error that caused this error.
     */
    error) {
        super(msg);
        this.code = code;
        this.error = error;
    }
}
exports.ProjectDetailsError = ProjectDetailsError;
class ProjectDetails {
    constructor({ rootDirectory, args = { _: [] }, e }) {
        this.rootDirectory = rootDirectory;
        this.e = e;
        this.args = args;
    }
    async getIdFromArgs() {
        const id = this.args && this.args['project'] ? String(this.args['project']) : undefined;
        if (id) {
            debug(`Project id from args: ${color_1.strong(id)}`);
            return id;
        }
    }
    async getIdFromPathMatch(config) {
        const { ctx } = this.e;
        for (const [key, value] of lodash.entries(config.projects)) {
            const id = key;
            if (value && value.root) {
                const projectDir = path.resolve(this.rootDirectory, value.root);
                if (ctx.execPath.startsWith(projectDir)) {
                    debug(`Project id from path match: ${color_1.strong(id)}`);
                    return id;
                }
            }
        }
    }
    async getIdFromDefaultProject(config) {
        const id = config.defaultProject;
        if (id) {
            debug(`Project id from defaultProject: ${color_1.strong(id)}`);
            return id;
        }
    }
    async getTypeFromConfig(config) {
        const { type } = config;
        if (type) {
            debug(`Project type from config: ${color_1.strong(prettyProjectName(type))} ${type ? color_1.strong(`(${type})`) : ''}`);
            return type;
        }
    }
    async getTypeFromDetection() {
        for (const projectType of constants_1.PROJECT_TYPES) {
            const p = await createProjectFromDetails({ context: 'app', configPath: path.resolve(this.rootDirectory, constants_1.PROJECT_FILE), type: projectType, errors: [] }, this.e);
            const type = p.type;
            // TODO: This is a hack to avoid accessing `this.config` within the
            // `Project.directory` getter, which writes config files.
            Object.defineProperty(p, 'directory', { value: this.rootDirectory, writable: false });
            if (await p.detected()) {
                debug(`Project type from detection: ${color_1.strong(prettyProjectName(type))} ${type ? color_1.strong(`(${type})`) : ''}`);
                return type;
            }
        }
    }
    async determineSingleApp(config) {
        const errors = [];
        let type = await fn_1.resolveValue(async () => this.getTypeFromConfig(config), async () => this.getTypeFromDetection());
        if (!type) {
            errors.push(new ProjectDetailsError('Could not determine project type', 'ERR_MISSING_PROJECT_TYPE'));
        }
        else if (!constants_1.PROJECT_TYPES.includes(type)) {
            errors.push(new ProjectDetailsError(`Invalid project type: ${type}`, 'ERR_INVALID_PROJECT_TYPE'));
            type = undefined;
        }
        return { context: 'app', type, errors };
    }
    async determineMultiApp(config) {
        const errors = [];
        const id = await fn_1.resolveValue(async () => this.getIdFromArgs(), async () => this.getIdFromPathMatch(config), async () => this.getIdFromDefaultProject(config));
        let type;
        if (id) {
            const app = config.projects[id];
            if (app) {
                const r = await this.determineSingleApp(app);
                type = r.type;
                errors.push(...r.errors);
            }
            else {
                errors.push(new ProjectDetailsError('Could not find project in config', 'ERR_MULTI_MISSING_CONFIG'));
            }
        }
        else {
            errors.push(new ProjectDetailsError('Could not determine project id', 'ERR_MULTI_MISSING_ID'));
        }
        return { context: 'multiapp', id, type, errors };
    }
    processResult(result) {
        const { log } = this.e;
        const errorCodes = result.errors.map(e => e.code);
        const e1 = result.errors.find(e => e.code === 'ERR_INVALID_PROJECT_FILE');
        const e2 = result.errors.find(e => e.code === 'ERR_INVALID_PROJECT_TYPE');
        if (e1) {
            log.error(`Error while loading config (project config: ${color_1.strong(utils_terminal_1.prettyPath(result.configPath))})\n` +
                `${e1.error ? `${e1.message}: ${color_1.failure(e1.error.toString())}` : color_1.failure(e1.message)}. ` +
                `Run ${color_1.input('ionic init')} to re-initialize your Ionic project. Without a valid project config, the CLI will not have project context.`);
            log.nl();
        }
        if (result.context === 'multiapp') {
            if (errorCodes.includes('ERR_MULTI_MISSING_ID')) {
                log.warn(`Multi-app workspace detected, but cannot determine which project to use.\n` +
                    `Please set a ${color_1.input('defaultProject')} in ${color_1.strong(utils_terminal_1.prettyPath(result.configPath))} or specify the project using the global ${color_1.input('--project')} option. Read the documentation${color_1.ancillary('[1]')} for more information.\n\n` +
                    `${color_1.ancillary('[1]')}: ${color_1.strong('https://ion.link/multi-app-docs')}`);
                log.nl();
            }
            if (result.id && errorCodes.includes('ERR_MULTI_MISSING_CONFIG')) {
                log.warn(`Multi-app workspace detected, but project was not found in configuration.\n` +
                    `Project ${color_1.input(result.id)} could not be found in the workspace. Did you add it to ${color_1.strong(utils_terminal_1.prettyPath(result.configPath))}?`);
            }
        }
        if (errorCodes.includes('ERR_MISSING_PROJECT_TYPE')) {
            const listWrapOptions = { width: utils_terminal_1.TTY_WIDTH - 8 - 3, indentation: 1 };
            log.warn(`Could not determine project type (project config: ${color_1.strong(utils_terminal_1.prettyPath(result.configPath))}).\n` +
                `- ${utils_terminal_1.wordWrap(`For ${color_1.strong(prettyProjectName('angular'))} projects, make sure ${color_1.input('@ionic/angular')} is listed as a dependency in ${color_1.strong('package.json')}.`, listWrapOptions)}\n` +
                `- ${utils_terminal_1.wordWrap(`For ${color_1.strong(prettyProjectName('ionic-angular'))} projects, make sure ${color_1.input('ionic-angular')} is listed as a dependency in ${color_1.strong('package.json')}.`, listWrapOptions)}\n` +
                `- ${utils_terminal_1.wordWrap(`For ${color_1.strong(prettyProjectName('ionic1'))} projects, make sure ${color_1.input('ionic')} is listed as a dependency in ${color_1.strong('bower.json')}.`, listWrapOptions)}\n\n` +
                `Alternatively, set ${color_1.strong('type')} attribute in ${color_1.strong(utils_terminal_1.prettyPath(result.configPath))} to one of: ${constants_1.PROJECT_TYPES.map(v => color_1.input(v)).join(', ')}.\n\n` +
                `If the Ionic CLI does not know what type of project this is, ${color_1.input('ionic build')}, ${color_1.input('ionic serve')}, and other commands may not work. You can use the ${color_1.input('custom')} project type if that's okay.`);
            log.nl();
        }
        if (e2) {
            log.error(`${e2.message} (project config: ${color_1.strong(utils_terminal_1.prettyPath(result.configPath))}).\n` +
                `Project type must be one of: ${constants_1.PROJECT_TYPES.map(v => color_1.input(v)).join(', ')}`);
            log.nl();
        }
    }
    async readConfig(p) {
        try {
            let configContents = await utils_fs_1.readFile(p, { encoding: 'utf8' });
            if (!configContents) {
                configContents = '{}\n';
                await utils_fs_1.writeFile(p, configContents, { encoding: 'utf8' });
            }
            return await JSON.parse(configContents);
        }
        catch (e) {
            throw new ProjectDetailsError('Could not read project file', 'ERR_INVALID_PROJECT_FILE', e);
        }
    }
    /**
     * Gather project details from specified configuration.
     *
     * This method will always resolve with a result object, with an array of
     * errors. Use `processResult()` to log warnings & errors.
     */
    async result() {
        const errors = [];
        const configPath = path.resolve(this.rootDirectory, constants_1.PROJECT_FILE);
        let config;
        try {
            config = await this.readConfig(configPath);
            if (guards_1.isProjectConfig(config)) {
                const r = await this.determineSingleApp(config);
                errors.push(...r.errors);
                return { ...r, configPath, errors };
            }
            if (guards_1.isMultiProjectConfig(config)) {
                const r = await this.determineMultiApp(config);
                errors.push(...r.errors);
                return { ...r, configPath, errors };
            }
            throw new ProjectDetailsError('Unknown project file structure', 'ERR_INVALID_PROJECT_FILE');
        }
        catch (e) {
            errors.push(e);
        }
        return { configPath, context: 'unknown', errors };
    }
}
exports.ProjectDetails = ProjectDetails;
async function createProjectFromDetails(details, deps) {
    const { context, type } = details;
    switch (type) {
        case 'angular':
            const { AngularProject } = await Promise.resolve().then(() => require('./angular'));
            return new AngularProject(details, deps);
        case 'react':
            const { ReactProject } = await Promise.resolve().then(() => require('./react'));
            return new ReactProject(details, deps);
        case 'vue':
            const { VueProject } = await Promise.resolve().then(() => require('./vue'));
            return new VueProject(details, deps);
        case 'ionic-angular':
            const { IonicAngularProject } = await Promise.resolve().then(() => require('./ionic-angular'));
            return new IonicAngularProject(details, deps);
        case 'ionic1':
            const { Ionic1Project } = await Promise.resolve().then(() => require('./ionic1'));
            return new Ionic1Project(details, deps);
        case 'custom':
            const { CustomProject } = await Promise.resolve().then(() => require('./custom'));
            return new CustomProject(details, deps);
    }
    // If we can't match any of the types above, but we've detected a multi-app
    // setup, it likely means this is a "bare" project, or a project without
    // apps. This can occur when `ionic start` is used for the first time in a
    // new multi-app setup.
    if (context === 'multiapp') {
        const { BareProject } = await Promise.resolve().then(() => require('./bare'));
        return new BareProject(details, deps);
    }
    throw new errors_1.FatalException(`Bad project type: ${color_1.strong(String(type))}`); // TODO?
}
exports.createProjectFromDetails = createProjectFromDetails;
async function findProjectDirectory(cwd) {
    return utils_fs_1.findBaseDirectory(cwd, constants_1.PROJECT_FILE);
}
exports.findProjectDirectory = findProjectDirectory;
async function createProjectFromDirectory(rootDirectory, args, deps, { logErrors = true } = {}) {
    const details = new ProjectDetails({ rootDirectory, args, e: deps });
    const result = await details.result();
    debug('Project details: %o', { ...result, errors: result.errors.map(e => e.code) });
    if (logErrors) {
        details.processResult(result);
    }
    if (result.context === 'unknown') {
        return;
    }
    return createProjectFromDetails(result, deps);
}
exports.createProjectFromDirectory = createProjectFromDirectory;
class ProjectConfig extends cli_framework_1.BaseConfig {
    constructor(p, { type, ...options } = {}) {
        super(p, options);
        this.type = type;
        const c = this.c;
        if (typeof c.app_id === 'string') { // <4.0.0 project config migration
            if (c.app_id && !c.id) {
                // set `id` only if it has not been previously set and if `app_id`
                // isn't an empty string (which it used to be, sometimes)
                this.set('id', c.app_id);
            }
            this.unset('app_id');
        }
        else if (typeof c.pro_id === 'string') {
            if (!c.id) {
                // set `id` only if it has not been previously set
                this.set('id', c.pro_id);
            }
            // we do not unset `pro_id` because it would break things
        }
    }
    provideDefaults(c) {
        return lodash.assign({
            name: 'New Ionic App',
            integrations: {},
            type: this.type,
        }, c);
    }
}
exports.ProjectConfig = ProjectConfig;
class MultiProjectConfig extends cli_framework_1.BaseConfig {
    provideDefaults(c) {
        return lodash.assign({
            projects: {},
        }, c);
    }
}
exports.MultiProjectConfig = MultiProjectConfig;
class Project {
    constructor(details, e) {
        this.details = details;
        this.e = e;
        this.rootDirectory = path.dirname(details.configPath);
    }
    get filePath() {
        return this.details.configPath;
    }
    get directory() {
        const root = this.config.get('root');
        if (!root) {
            return this.rootDirectory;
        }
        return path.resolve(this.rootDirectory, root);
    }
    get pathPrefix() {
        const id = this.details.context === 'multiapp' ? this.details.id : undefined;
        return id ? ['projects', id] : [];
    }
    get config() {
        const options = { type: this.type, pathPrefix: this.pathPrefix };
        return new ProjectConfig(this.filePath, options);
    }
    async getBuildRunner() {
        try {
            return await this.requireBuildRunner();
        }
        catch (e) {
            if (!(e instanceof errors_1.RunnerNotFoundException)) {
                throw e;
            }
        }
    }
    async getServeRunner() {
        try {
            return await this.requireServeRunner();
        }
        catch (e) {
            if (!(e instanceof errors_1.RunnerNotFoundException)) {
                throw e;
            }
        }
    }
    async getGenerateRunner() {
        try {
            return await this.requireGenerateRunner();
        }
        catch (e) {
            if (!(e instanceof errors_1.RunnerNotFoundException)) {
                throw e;
            }
        }
    }
    async requireAppflowId() {
        const appflowId = this.config.get('id');
        if (!appflowId) {
            throw new errors_1.FatalException(`Your project file (${color_1.strong(utils_terminal_1.prettyPath(this.filePath))}) does not contain '${color_1.strong('id')}'. ` +
                `Run ${color_1.input('ionic link')}.`);
        }
        return appflowId;
    }
    get packageJsonPath() {
        return path.resolve(this.directory, 'package.json');
    }
    async getPackageJson(pkgName, { logErrors = true } = {}) {
        let pkg;
        let pkgPath;
        try {
            pkgPath = pkgName ? require.resolve(`${pkgName}/package`, { paths: node_1.compileNodeModulesPaths(this.directory) }) : this.packageJsonPath;
            pkg = await node_1.readPackageJsonFile(pkgPath);
        }
        catch (e) {
            if (logErrors) {
                this.e.log.warn(`Error loading ${color_1.strong(pkgName ? pkgName : `project's`)} ${color_1.strong('package.json')}: ${e}`);
            }
        }
        return [pkg, pkgPath ? path.dirname(pkgPath) : undefined];
    }
    async requirePackageJson(pkgName) {
        try {
            const pkgPath = pkgName ? require.resolve(`${pkgName}/package`, { paths: node_1.compileNodeModulesPaths(this.directory) }) : this.packageJsonPath;
            return await node_1.readPackageJsonFile(pkgPath);
        }
        catch (e) {
            if (e instanceof SyntaxError) {
                throw new errors_1.FatalException(`Could not parse ${color_1.strong(pkgName ? pkgName : `project's`)} ${color_1.strong('package.json')}. Is it a valid JSON file?`);
            }
            else if (e === node_1.ERROR_INVALID_PACKAGE_JSON) {
                throw new errors_1.FatalException(`The ${color_1.strong(pkgName ? pkgName : `project's`)} ${color_1.strong('package.json')} file seems malformed.`);
            }
            throw e; // Probably file not found
        }
    }
    async getDocsUrl() {
        return 'https://ion.link/docs';
    }
    async getSourceDir() {
        return path.resolve(this.directory, 'src');
    }
    async getDefaultDistDir() {
        return 'www';
    }
    async getDistDir() {
        if (this.getIntegration('capacitor') !== undefined) {
            const capacitor = await this.createIntegration('capacitor');
            const conf = await capacitor.getCapacitorConfig();
            const webDir = conf === null || conf === void 0 ? void 0 : conf.webDir;
            if (webDir) {
                return path.resolve(capacitor.root, webDir);
            }
            else {
                throw new errors_1.FatalException(`The ${color_1.input('webDir')} property must be set in the Capacitor configuration file. \n` +
                    `See the Capacitor docs for more information: ${color_1.strong('https://capacitor.ionicframework.com/docs/basics/configuring-your-app')}`);
            }
        }
        else {
            return path.resolve(this.directory, 'www');
        }
    }
    async getInfo() {
        const integrations = await this.getIntegrations();
        const integrationInfo = lodash.flatten(await Promise.all(integrations.map(async (i) => i.getInfo())));
        return integrationInfo;
    }
    async personalize(details) {
        const { name, projectId, description, version, themeColor, appIcon, splash } = details;
        this.config.set('name', name);
        const pkg = await this.requirePackageJson();
        pkg.name = projectId;
        pkg.version = version ? version : '0.0.1';
        pkg.description = description ? description : 'An Ionic project';
        await utils_fs_1.writeJson(this.packageJsonPath, pkg, { spaces: 2 });
        if (themeColor) {
            await this.setPrimaryTheme(themeColor);
        }
        if (appIcon && splash) {
            await this.setAppResources(appIcon, splash);
        }
        const integrations = await this.getIntegrations();
        await Promise.all(integrations.map(async (i) => i.personalize(details)));
    }
    // Empty to avoid sub-classes having to implement
    async setPrimaryTheme(_themeColor) { }
    async writeThemeColor(variablesPath, themeColor) {
        const light = new color_2.Color(themeColor);
        const ionicThemeLightDarkMap = {
            '#3880ff': '#4c8dff',
            '#5260ff': '#6a64ff',
            '#2dd36f': '#2fdf75',
            '#ffc409': '#ffd534',
            '#eb445a': '#ff4961',
            '#f4f5f8': '#222428',
            '#92949c': '#989aa2',
            '#222428': '#f4f5f8',
        };
        const matchingThemeColor = ionicThemeLightDarkMap[themeColor];
        let dark;
        // If this is a standard Ionic theme color, then use the hard-coded dark mode
        // colors. Otherwise, compute a plausible dark mode color for this theme
        if (matchingThemeColor) {
            dark = new color_2.Color(matchingThemeColor);
        }
        else if (light.yiq > 128) {
            // Light mode was light enough, just use it for both
            dark = light;
        }
        else {
            // Light mode was too dark, so tint it to make it brighter
            dark = light.tint(0.6);
        }
        // Build the light colors
        const lightContrastRgb = light.contrast().rgb;
        const lightVariables = {
            '--ion-color-primary': `${themeColor}`,
            '--ion-color-primary-rgb': `${light.rgb.r}, ${light.rgb.g}, ${light.rgb.b}`,
            '--ion-color-primary-contrast': `${light.contrast().hex}`,
            '--ion-color-primary-contrast-rgb': `${lightContrastRgb.r}, ${lightContrastRgb.g}, ${lightContrastRgb.b}`,
            '--ion-color-primary-shade': `${light.shade().hex}`,
            '--ion-color-primary-tint': `${light.tint().hex}`,
        };
        const darkContrastRgb = dark.contrast().rgb;
        const darkVariables = {
            '--ion-color-primary': `${dark.hex}`,
            '--ion-color-primary-rgb': `${dark.rgb.r}, ${dark.rgb.g}, ${dark.rgb.b}`,
            '--ion-color-primary-contrast': `${dark.contrast().hex}`,
            '--ion-color-primary-contrast-rgb': `${darkContrastRgb.r}, ${darkContrastRgb.g}, ${darkContrastRgb.b}`,
            '--ion-color-primary-shade': `${dark.shade().hex}`,
            '--ion-color-primary-tint': `${dark.tint().hex}`,
        };
        try {
            let themeVarsContents = await utils_fs_1.readFile(variablesPath, { encoding: 'utf8' });
            // Replace every theme variable with the updated ones
            for (const v in lightVariables) {
                const regExp = new RegExp(`(${v}):([^;]*)`, 'g');
                let variableIndex = 0;
                themeVarsContents = themeVarsContents.replace(regExp, (str, match) => {
                    if (variableIndex === 0) {
                        variableIndex++;
                        return `${match}: ${lightVariables[v]}`;
                    }
                    return str;
                });
            }
            for (const v in darkVariables) {
                const regExp = new RegExp(`(${v}):([^;]*)`, 'g');
                let variableIndex = 0;
                themeVarsContents = themeVarsContents.replace(regExp, (str, match) => {
                    if (variableIndex === 1) {
                        return `${match}: ${darkVariables[v]}`;
                    }
                    variableIndex++;
                    return str;
                });
            }
            await utils_fs_1.writeFile(variablesPath, themeVarsContents);
        }
        catch (e) {
            const { log } = this.e;
            log.error(`Unable to modify theme variables, theme will need to be set manually: ${e}`);
        }
    }
    async setAppResources(appIcon, splash) {
        const resourcesDir = path.join(this.directory, 'resources');
        const iconPath = path.join(resourcesDir, 'icon.png');
        const splashPath = path.join(resourcesDir, 'splash.png');
        try {
            await utils_fs_1.ensureDir(resourcesDir);
            await utils_fs_1.writeFile(iconPath, appIcon);
            await utils_fs_1.writeFile(splashPath, splash);
        }
        catch (e) {
            const { log } = this.e;
            log.error(`Unable to find or create the resources directory. Skipping icon generation: ${e}`);
        }
    }
    async registerAilments(registry) {
        const ailments = await Promise.resolve().then(() => require('../doctor/ailments'));
        const deps = { ...this.e, project: this };
        registry.register(new ailments.NpmInstalledLocally(deps));
        registry.register(new ailments.IonicCLIInstalledLocally(deps));
        registry.register(new ailments.GitNotUsed(deps));
        registry.register(new ailments.GitConfigInvalid(deps));
        registry.register(new ailments.IonicNativeOldVersionInstalled(deps));
        registry.register(new ailments.UnsavedCordovaPlatforms(deps));
        registry.register(new ailments.DefaultCordovaBundleIdUsed(deps));
        registry.register(new ailments.ViewportFitNotSet(deps));
        registry.register(new ailments.CordovaPlatformsCommitted(deps));
    }
    async createIntegration(name) {
        return integrations_1.BaseIntegration.createFromName({
            client: this.e.client,
            config: this.e.config,
            log: this.e.log,
            project: this,
            prompt: this.e.prompt,
            session: this.e.session,
            shell: this.e.shell,
        }, name);
    }
    getIntegration(name) {
        const integration = this.config.get('integrations')[name];
        if (integration) {
            return {
                enabled: integration.enabled !== false,
                root: integration.root === undefined ? this.directory : path.resolve(this.rootDirectory, integration.root),
            };
        }
    }
    requireIntegration(name) {
        const id = this.details.context === 'multiapp' ? this.details.id : undefined;
        const integration = this.getIntegration(name);
        if (!integration) {
            throw new errors_1.FatalException(`Could not find ${color_1.strong(name)} integration in the ${color_1.strong(id ? id : 'default')} project.`);
        }
        if (!integration.enabled) {
            throw new errors_1.FatalException(`${color_1.strong(name)} integration is disabled in the ${color_1.strong(id ? id : 'default')} project.`);
        }
        return integration;
    }
    async getIntegrations() {
        const integrationsFromConfig = this.config.get('integrations');
        const names = Object.keys(integrationsFromConfig); // TODO
        const integrationNames = names.filter(n => {
            const c = integrationsFromConfig[n];
            return c && c.enabled !== false;
        });
        const integrations = await Promise.all(integrationNames.map(async (name) => {
            try {
                return await this.createIntegration(name);
            }
            catch (e) {
                if (!(e instanceof errors_1.IntegrationNotFoundException)) {
                    throw e;
                }
                this.e.log.warn(e.message);
            }
        }));
        return integrations.filter((i) => typeof i !== 'undefined');
    }
}
exports.Project = Project;
function prettyProjectName(type) {
    if (!type) {
        return 'Unknown';
    }
    if (type === 'angular') {
        return '@ionic/angular';
    }
    else if (type === 'react') {
        return '@ionic/react';
    }
    else if (type === 'vue') {
        return '@ionic/vue';
    }
    else if (type === 'ionic-angular') {
        return 'Ionic 2/3';
    }
    else if (type === 'ionic1') {
        return 'Ionic 1';
    }
    else if (type === 'custom') {
        return 'Custom';
    }
    return type;
}
exports.prettyProjectName = prettyProjectName;
function isValidProjectId(projectId) {
    return projectId !== '.' && node_1.isValidPackageName(projectId) && projectId === path.basename(projectId);
}
exports.isValidProjectId = isValidProjectId;
