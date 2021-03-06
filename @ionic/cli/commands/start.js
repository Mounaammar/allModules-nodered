"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const string_1 = require("@ionic/cli-framework/utils/string");
const utils_fs_1 = require("@ionic/utils-fs");
const utils_terminal_1 = require("@ionic/utils-terminal");
const chalk = require("chalk");
const Debug = require("debug");
const path = require("path");
const constants_1 = require("../constants");
const color_1 = require("../lib/color");
const command_1 = require("../lib/command");
const errors_1 = require("../lib/errors");
const executor_1 = require("../lib/executor");
const project_1 = require("../lib/project");
const session_1 = require("../lib/session");
const shell_1 = require("../lib/shell");
const start_1 = require("../lib/start");
const emoji_1 = require("../lib/utils/emoji");
const http_1 = require("../lib/utils/http");
const debug = Debug('ionic:commands:start');
class StartCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.canRemoveExisting = false;
    }
    async getMetadata() {
        return {
            name: 'start',
            type: 'global',
            summary: 'Create a new project',
            description: `
This command creates a working Ionic app. It installs dependencies for you and sets up your project.

Running ${color_1.input('ionic start')} without any arguments will prompt you for information about your new project.

The first argument is your app's ${color_1.input('name')}. Don't worry--you can always change this later. The ${color_1.input('--project-id')} is generated from ${color_1.input('name')} unless explicitly specified.

The second argument is the ${color_1.input('template')} from which to generate your app. You can list all templates with the ${color_1.input('--list')} option. You can also specify a git repository URL for ${color_1.input('template')}, in which case the existing project will be cloned.

Use the ${color_1.input('--type')} option to start projects using older versions of Ionic. For example, you can start an Ionic 3 project with ${color_1.input('--type=ionic-angular')}. Use ${color_1.input('--list')} to see all project types and templates.
      `,
            exampleCommands: [
                '',
                '--list',
                'myApp',
                'myApp blank',
                'myApp tabs --cordova',
                'myApp tabs --capacitor',
                'myApp super --type=ionic-angular',
                'myApp blank --type=ionic1',
                'cordovaApp tabs --cordova',
                '"My App" blank',
                '"Conference App" https://github.com/ionic-team/ionic-conference-app',
            ],
            inputs: [
                {
                    name: 'name',
                    summary: `The name of your new project (e.g. ${color_1.input('myApp')}, ${color_1.input('"My App"')})`,
                    validators: [cli_framework_1.validators.required],
                },
                {
                    name: 'template',
                    summary: `The starter template to use (e.g. ${['blank', 'tabs'].map(t => color_1.input(t)).join(', ')}; use ${color_1.input('--list')} to see all)`,
                    validators: [cli_framework_1.validators.required],
                },
            ],
            options: [
                {
                    name: 'list',
                    summary: 'List available starter templates',
                    type: Boolean,
                    aliases: ['l'],
                },
                {
                    name: 'type',
                    summary: `Type of project to start (e.g. ${start_1.getStarterProjectTypes().map(type => color_1.input(type)).join(', ')})`,
                    type: String,
                },
                {
                    name: 'cordova',
                    summary: 'Include Cordova integration',
                    type: Boolean,
                },
                {
                    name: 'capacitor',
                    summary: 'Include Capacitor integration',
                    type: Boolean,
                    groups: ["experimental" /* EXPERIMENTAL */],
                },
                {
                    name: 'deps',
                    summary: 'Do not install npm/yarn dependencies',
                    type: Boolean,
                    default: true,
                    groups: ["advanced" /* ADVANCED */],
                },
                {
                    name: 'git',
                    summary: 'Do not initialize a git repo',
                    type: Boolean,
                    default: true,
                    groups: ["advanced" /* ADVANCED */],
                },
                {
                    name: 'link',
                    summary: 'Connect your new app to Ionic',
                    type: Boolean,
                    groups: ["advanced" /* ADVANCED */],
                },
                {
                    name: 'id',
                    summary: 'Specify an Ionic App ID to link',
                },
                {
                    name: 'project-id',
                    summary: 'Specify a slug for your app (used for the directory name and package name)',
                    groups: ["advanced" /* ADVANCED */],
                    spec: { value: 'slug' },
                },
                {
                    name: 'package-id',
                    summary: 'Specify the bundle ID/application ID for your app (reverse-DNS notation)',
                    groups: ["advanced" /* ADVANCED */],
                    spec: { value: 'id' },
                },
                {
                    name: 'start-id',
                    summary: 'Used by the Ionic app start experience to generate an associated app locally',
                    groups: ["hidden" /* HIDDEN */],
                    spec: { value: 'id' },
                },
                {
                    name: 'tag',
                    summary: `Specify a tag to use for the starters (e.g. ${['latest', 'testing', 'next'].map(t => color_1.input(t)).join(', ')})`,
                    default: 'latest',
                    groups: ["hidden" /* HIDDEN */],
                },
            ],
        };
    }
    async startIdStart(inputs, options) {
        const startId = options['start-id'];
        const wizardApiUrl = process.env.START_WIZARD_URL_BASE || `https://ionicframework.com`;
        const { req } = await http_1.createRequest('GET', `${wizardApiUrl}/api/v1/wizard/app/${startId}`, this.env.config.getHTTPConfig());
        const error = (e) => {
            this.env.log.error(`No such app ${chalk.bold(startId)}. This app configuration may have expired. Please retry at https://ionicframework.com/start`);
            if (e) {
                throw e;
            }
        };
        let data;
        try {
            const ret = await req;
            if (ret.status !== 200) {
                return error();
            }
            data = (await req).body;
            if (!data) {
                return error();
            }
        }
        catch (e) {
            return error(e);
        }
        let projectDir = string_1.slugify(data.name);
        if (inputs.length === 1) {
            projectDir = inputs[0];
        }
        await this.checkForExisting(projectDir);
        inputs.push(data.name);
        inputs.push(data.template);
        await this.startIdConvert(startId);
        const appIconBuffer = data.appIcon ?
            Buffer.from(data.appIcon.replace(/^data:image\/\w+;base64,/, ''), 'base64') :
            undefined;
        const splashBuffer = data.appSplash ?
            Buffer.from(data.appSplash.replace(/^data:image\/\w+;base64,/, ''), 'base64') :
            undefined;
        this.schema = {
            cloned: false,
            name: data.name,
            type: data.type,
            template: data.template,
            projectId: string_1.slugify(data.name),
            projectDir,
            packageId: data['package-id'],
            appflowId: undefined,
            appIcon: appIconBuffer,
            splash: splashBuffer,
            themeColor: data.theme,
        };
    }
    async startIdConvert(id) {
        const wizardApiUrl = process.env.START_WIZARD_URL_BASE || `https://ionicframework.com`;
        if (!wizardApiUrl) {
            return;
        }
        const { req } = await http_1.createRequest('POST', `${wizardApiUrl}/api/v1/wizard/app/${id}/start`, this.env.config.getHTTPConfig());
        try {
            await req;
        }
        catch (e) {
            this.env.log.warn(`Unable to set app flag on server: ${e.message}`);
        }
    }
    async preRun(inputs, options) {
        const { promptToLogin } = await Promise.resolve().then(() => require('../lib/session'));
        start_1.verifyOptions(options, this.env);
        const appflowId = options['id'] ? String(options['id']) : undefined;
        if (appflowId) {
            if (!this.env.session.isLoggedIn()) {
                await promptToLogin(this.env);
            }
        }
        // The start wizard pre-populates all arguments for the CLI
        if (options['start-id']) {
            await this.startIdStart(inputs, options);
            return;
        }
        const projectType = string_1.isValidURL(inputs[1]) ? 'custom' : options['type'] ? String(options['type']) : await this.getProjectType();
        if (options['cordova']) {
            const { checkForUnsupportedProject } = await Promise.resolve().then(() => require('../lib/integrations/cordova/utils'));
            try {
                await checkForUnsupportedProject(projectType);
            }
            catch (e) {
                this.env.log.error(e.message);
                options['cordova'] = false;
            }
        }
        if (!inputs[0]) {
            if (appflowId) {
                const { AppClient } = await Promise.resolve().then(() => require('../lib/app'));
                const token = await this.env.session.getUserToken();
                const appClient = new AppClient(token, this.env);
                const tasks = this.createTaskChain();
                tasks.next(`Looking up app ${color_1.input(appflowId)}`);
                const app = await appClient.load(appflowId);
                // TODO: can ask to clone via repo_url
                tasks.end();
                this.env.log.info(`Using ${color_1.strong(app.name)} for ${color_1.input('name')} and ${color_1.strong(app.slug)} for ${color_1.input('--project-id')}.`);
                inputs[0] = app.name;
                options['project-id'] = app.slug;
            }
            else {
                if (this.env.flags.interactive) {
                    this.env.log.nl();
                    this.env.log.msg(`${color_1.strong(`Every great app needs a name! ${emoji_1.emoji('????', '')}`)}\n` +
                        `Please enter the full name of your app. You can change this at any time. To bypass this prompt next time, supply ${color_1.input('name')}, the first argument to ${color_1.input('ionic start')}.\n\n`);
                }
                const name = await this.env.prompt({
                    type: 'input',
                    name: 'name',
                    message: 'Project name:',
                    validate: v => cli_framework_1.validators.required(v),
                });
                inputs[0] = name;
            }
        }
        if (!inputs[1]) {
            if (this.env.flags.interactive) {
                this.env.log.nl();
                this.env.log.msg(`${color_1.strong(`Let's pick the perfect starter template! ${emoji_1.emoji('????', '')}`)}\n` +
                    `Starter templates are ready-to-go Ionic apps that come packed with everything you need to build your app. To bypass this prompt next time, supply ${color_1.input('template')}, the second argument to ${color_1.input('ionic start')}.\n\n`);
            }
            const template = await this.env.prompt({
                type: 'list',
                name: 'template',
                message: 'Starter template:',
                choices: () => {
                    const starterTemplateList = start_1.STARTER_TEMPLATES.filter(st => st.projectType === projectType);
                    const cols = utils_terminal_1.columnar(starterTemplateList.map(({ name, description }) => [color_1.input(name), description || '']), constants_1.COLUMNAR_OPTIONS).split('\n');
                    if (starterTemplateList.length === 0) {
                        throw new errors_1.FatalException(`No starter templates found for project type: ${color_1.input(projectType)}.`);
                    }
                    return starterTemplateList.map((starter, i) => {
                        return {
                            name: cols[i],
                            short: starter.name,
                            value: starter.name,
                        };
                    });
                },
            });
            inputs[1] = template;
        }
        const starterTemplate = start_1.STARTER_TEMPLATES.find(t => t.name === inputs[1] && t.projectType === projectType);
        if (starterTemplate && starterTemplate.type === 'repo') {
            inputs[1] = starterTemplate.repo;
        }
        const cloned = string_1.isValidURL(inputs[1]);
        if (this.project && this.project.details.context === 'app') {
            const confirm = await this.env.prompt({
                type: 'confirm',
                name: 'confirm',
                message: 'You are already in an Ionic project directory. Do you really want to start another project here?',
                default: false,
            });
            if (!confirm) {
                this.env.log.info('Not starting project within existing project.');
                throw new errors_1.FatalException();
            }
        }
        await this.validateProjectType(projectType);
        if (cloned) {
            if (!options['git']) {
                this.env.log.warn(`The ${color_1.input('--no-git')} option has no effect when cloning apps. Git must be used.`);
            }
            options['git'] = true;
        }
        if (options['v1'] || options['v2']) {
            throw new errors_1.FatalException(`The ${color_1.input('--v1')} and ${color_1.input('--v2')} flags have been removed.\n` +
                `Use the ${color_1.input('--type')} option. (see ${color_1.input('ionic start --help')})`);
        }
        if (options['app-name']) {
            this.env.log.warn(`The ${color_1.input('--app-name')} option has been removed. Use the ${color_1.input('name')} argument with double quotes: e.g. ${color_1.input('ionic start "My App"')}`);
        }
        if (options['display-name']) {
            this.env.log.warn(`The ${color_1.input('--display-name')} option has been removed. Use the ${color_1.input('name')} argument with double quotes: e.g. ${color_1.input('ionic start "My App"')}`);
        }
        if (options['bundle-id']) {
            this.env.log.warn(`The ${color_1.input('--bundle-id')} option has been deprecated. Please use ${color_1.input('--package-id')}.`);
            options['package-id'] = options['bundle-id'];
        }
        let projectId = options['project-id'] ? String(options['project-id']) : undefined;
        if (projectId) {
            await this.validateProjectId(projectId);
        }
        else {
            projectId = options['project-id'] = project_1.isValidProjectId(inputs[0]) ? inputs[0] : string_1.slugify(inputs[0]);
        }
        const projectDir = path.resolve(projectId);
        const packageId = options['package-id'] ? String(options['package-id']) : undefined;
        if (projectId) {
            await this.checkForExisting(projectDir);
        }
        if (cloned) {
            this.schema = {
                cloned: true,
                url: inputs[1],
                projectId,
                projectDir,
            };
        }
        else {
            this.schema = {
                cloned: false,
                name: inputs[0],
                type: projectType,
                template: inputs[1],
                projectId,
                projectDir,
                packageId,
                appflowId,
                themeColor: undefined,
            };
        }
    }
    async getProjectType() {
        if (this.env.flags.interactive) {
            this.env.log.nl();
            this.env.log.msg(`${color_1.strong(`Pick a framework! ${emoji_1.emoji('????', '')}`)}\n\n` +
                `Please select the JavaScript framework to use for your new app. To bypass this prompt next time, supply a value for the ${color_1.input('--type')} option.\n\n`);
        }
        const frameworkChoice = await this.env.prompt({
            type: 'list',
            name: 'frameworks',
            message: 'Framework:',
            default: 'angular',
            choices: () => {
                const cols = utils_terminal_1.columnar(start_1.SUPPORTED_FRAMEWORKS.map(({ name, description }) => [color_1.input(name), description]), constants_1.COLUMNAR_OPTIONS).split('\n');
                return start_1.SUPPORTED_FRAMEWORKS.map((starterTemplate, i) => {
                    return {
                        name: cols[i],
                        short: starterTemplate.name,
                        value: starterTemplate.type,
                    };
                });
            },
        });
        return frameworkChoice;
    }
    async run(inputs, options, runinfo) {
        const { pkgManagerArgs } = await Promise.resolve().then(() => require('../lib/utils/npm'));
        const { getTopLevel, isGitInstalled } = await Promise.resolve().then(() => require('../lib/git'));
        if (!this.schema) {
            throw new errors_1.FatalException(`Invalid start schema: cannot start app.`);
        }
        const { projectId, projectDir, packageId, appflowId } = this.schema;
        const tag = options['tag'] ? String(options['tag']) : 'latest';
        let linkConfirmed = typeof appflowId === 'string';
        const gitDesired = options['git'] ? true : false;
        const gitInstalled = await isGitInstalled(this.env);
        const gitTopLevel = await getTopLevel(this.env);
        let gitIntegration = gitDesired && gitInstalled && !gitTopLevel ? true : false;
        if (!gitInstalled) {
            const installationDocs = `See installation docs for git: ${color_1.strong('https://git-scm.com/book/en/v2/Getting-Started-Installing-Git')}`;
            if (appflowId) {
                throw new errors_1.FatalException(`Git CLI not found on your PATH.\n` +
                    `Git must be installed to connect this app to Ionic. ${installationDocs}`);
            }
            if (this.schema.cloned) {
                throw new errors_1.FatalException(`Git CLI not found on your PATH.\n` +
                    `Git must be installed to clone apps with ${color_1.input('ionic start')}. ${installationDocs}`);
            }
        }
        if (gitTopLevel && !this.schema.cloned) {
            this.env.log.info(`Existing git project found (${color_1.strong(gitTopLevel)}). Git operations are disabled.`);
        }
        const tasks = this.createTaskChain();
        tasks.next(`Preparing directory ${color_1.input(utils_terminal_1.prettyPath(projectDir))}`);
        if (this.canRemoveExisting) {
            await utils_fs_1.remove(projectDir);
        }
        await utils_fs_1.mkdir(projectDir);
        tasks.end();
        if (this.schema.cloned) {
            await this.env.shell.run('git', ['clone', this.schema.url, projectDir, '--progress'], { stdio: 'inherit' });
        }
        else {
            const starterTemplate = await this.findStarterTemplate(this.schema.template, this.schema.type, tag);
            await this.downloadStarterTemplate(projectDir, starterTemplate);
        }
        let project;
        if (this.project && this.project.details.context === 'multiapp' && !this.schema.cloned) {
            // We're in a multi-app setup, so the new config file isn't wanted.
            await utils_fs_1.unlink(path.resolve(projectDir, constants_1.PROJECT_FILE));
            project = await project_1.createProjectFromDetails({ context: 'multiapp', configPath: path.resolve(this.project.rootDirectory, constants_1.PROJECT_FILE), id: projectId, type: this.schema.type, errors: [] }, this.env);
            project.config.set('type', this.schema.type);
            project.config.set('root', path.relative(this.project.rootDirectory, projectDir));
        }
        else {
            project = await project_1.createProjectFromDirectory(projectDir, { _: [] }, this.env, { logErrors: false });
        }
        // start is weird, once the project directory is created, it becomes a
        // "project" command and so we replace the `Project` instance that was
        // autogenerated when the CLI booted up. This has worked thus far?
        this.namespace.root.project = project;
        if (!this.project) {
            throw new errors_1.FatalException('Error while loading project.');
        }
        this.env.shell.alterPath = p => shell_1.prependNodeModulesBinToPath(projectDir, p);
        if (!this.schema.cloned) {
            if (this.schema.type === 'react' || this.schema.type === 'vue') {
                options['capacitor'] = true;
            }
            if (options['cordova']) {
                const { confirmCordovaUsage } = await Promise.resolve().then(() => require('../lib/integrations/cordova/utils'));
                const confirm = await confirmCordovaUsage(this.env);
                if (confirm) {
                    await executor_1.runCommand(runinfo, ['integrations', 'enable', 'cordova', '--quiet']);
                }
                else {
                    options['cordova'] = false;
                }
            }
            if (options['capacitor'] === null && !options['cordova']) {
                const confirm = await this.env.prompt({
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Integrate your new app with Capacitor to target native iOS and Android?',
                    default: false,
                });
                if (confirm) {
                    options['capacitor'] = true;
                }
            }
            if (options['capacitor']) {
                await executor_1.runCommand(runinfo, ['integrations', 'enable', 'capacitor', '--quiet', '--', this.schema.name, packageId ? packageId : 'io.ionic.starter']);
            }
            await this.project.personalize({
                name: this.schema.name,
                projectId,
                packageId,
                appIcon: this.schema.appIcon,
                splash: this.schema.splash,
                themeColor: this.schema.themeColor,
            });
            this.env.log.nl();
        }
        const shellOptions = { cwd: projectDir, stdio: 'inherit' };
        if (options['deps']) {
            this.env.log.msg('Installing dependencies may take several minutes.');
            this.env.log.rawmsg(start_1.getAdvertisement());
            const [installer, ...installerArgs] = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install' });
            await this.env.shell.run(installer, installerArgs, shellOptions);
        }
        else {
            // --no-deps flag was used so skip installing dependencies, this also results in the package.json being out sync with the package.json so warn the user
            this.env.log.warn('Using the --no-deps flag results in an out of date package lock file. The lock file can be updated by performing an `install` with your package manager.');
        }
        if (!this.schema.cloned) {
            if (gitIntegration) {
                try {
                    await this.env.shell.run('git', ['init'], shellOptions); // TODO: use initializeRepo()?
                }
                catch (e) {
                    this.env.log.warn('Error encountered during repo initialization. Disabling further git operations.');
                    gitIntegration = false;
                }
            }
            // Prompt to create account
            if (!this.env.session.isLoggedIn()) {
                await session_1.promptToSignup(this.env);
            }
            if (options['link']) {
                const cmdArgs = ['link'];
                if (appflowId) {
                    cmdArgs.push(appflowId);
                }
                cmdArgs.push('--name', this.schema.name);
                await executor_1.runCommand(runinfo, cmdArgs);
                linkConfirmed = true;
            }
            const manifestPath = path.resolve(projectDir, 'ionic.starter.json');
            const manifest = await this.loadManifest(manifestPath);
            if (manifest) {
                await utils_fs_1.unlink(manifestPath);
            }
            if (gitIntegration) {
                try {
                    await this.env.shell.run('git', ['add', '-A'], shellOptions);
                    await this.env.shell.run('git', ['commit', '-m', 'Initial commit', '--no-gpg-sign'], shellOptions);
                }
                catch (e) {
                    this.env.log.warn('Error encountered during commit. Disabling further git operations.');
                    gitIntegration = false;
                }
            }
            if (manifest) {
                await this.performManifestOps(manifest);
            }
        }
        this.env.log.nl();
        await this.showNextSteps(projectDir, this.schema.cloned, linkConfirmed, !options['cordova']);
    }
    async checkForExisting(projectDir) {
        const projectExists = await utils_fs_1.pathExists(projectDir);
        if (projectExists) {
            const confirm = await this.env.prompt({
                type: 'confirm',
                name: 'confirm',
                message: `${color_1.input(utils_terminal_1.prettyPath(projectDir))} exists. ${color_1.failure('Overwrite?')}`,
                default: false,
            });
            if (!confirm) {
                this.env.log.msg(`Not erasing existing project in ${color_1.input(utils_terminal_1.prettyPath(projectDir))}.`);
                throw new errors_1.FatalException();
            }
            this.canRemoveExisting = confirm;
        }
    }
    async findStarterTemplate(template, type, tag) {
        const starterTemplate = start_1.STARTER_TEMPLATES.find(t => t.projectType === type && t.name === template);
        if (starterTemplate && starterTemplate.type === 'managed') {
            return {
                ...starterTemplate,
                archive: `${start_1.STARTER_BASE_URL}/${tag === 'latest' ? '' : `${tag}/`}${starterTemplate.id}.tar.gz`,
            };
        }
        const tasks = this.createTaskChain();
        tasks.next('Looking up starter');
        const starterList = await start_1.getStarterList(this.env.config, tag);
        const starter = starterList.starters.find(t => t.type === type && t.name === template);
        if (starter) {
            tasks.end();
            return {
                name: starter.name,
                projectType: starter.type,
                archive: `${start_1.STARTER_BASE_URL}/${tag === 'latest' ? '' : `${tag}/`}${starter.id}.tar.gz`,
            };
        }
        else {
            throw new errors_1.FatalException(`Unable to find starter template for ${color_1.input(template)}\n` +
                `If this is not a typo, please make sure it is a valid starter template within the starters repo: ${color_1.strong('https://github.com/ionic-team/starters')}`);
        }
    }
    async validateProjectType(type) {
        const projectTypes = start_1.getStarterProjectTypes();
        if (!['custom', ...projectTypes].includes(type)) {
            throw new errors_1.FatalException(`${color_1.input(type)} is not a valid project type.\n` +
                `Please choose a different ${color_1.input('--type')}. Use ${color_1.input('ionic start --list')} to list all available starter templates.`);
        }
    }
    async validateProjectId(projectId) {
        if (!project_1.isValidProjectId(projectId)) {
            throw new errors_1.FatalException(`${color_1.input(projectId)} is not a valid package or directory name.\n` +
                `Please choose a different ${color_1.input('--project-id')}. Alphanumeric characters are always safe.`);
        }
    }
    async loadManifest(manifestPath) {
        try {
            return await start_1.readStarterManifest(manifestPath);
        }
        catch (e) {
            debug(`Error with manifest file ${color_1.strong(utils_terminal_1.prettyPath(manifestPath))}: ${e}`);
        }
    }
    async performManifestOps(manifest) {
        if (manifest.welcome) {
            this.env.log.nl();
            this.env.log.msg(`${color_1.strong('Starter Welcome')}:`);
            this.env.log.msg(manifest.welcome);
        }
    }
    async downloadStarterTemplate(projectDir, starterTemplate) {
        const { createRequest, download } = await Promise.resolve().then(() => require('../lib/utils/http'));
        const { tar } = await Promise.resolve().then(() => require('../lib/utils/archive'));
        const tasks = this.createTaskChain();
        const task = tasks.next(`Downloading and extracting ${color_1.input(starterTemplate.name.toString())} starter`);
        debug('Tar extraction created for %s', projectDir);
        const ws = tar.extract({ cwd: projectDir });
        const { req } = await createRequest('GET', starterTemplate.archive, this.env.config.getHTTPConfig());
        await download(req, ws, { progress: (loaded, total) => task.progress(loaded, total) });
        tasks.end();
    }
    async showNextSteps(projectDir, cloned, linkConfirmed, isCapacitor) {
        const cordovaResCommand = isCapacitor ? 'cordova-res --skip-config --copy' : 'cordova-res';
        const steps = [
            `Go to your ${cloned ? 'cloned' : 'new'} project: ${color_1.input(`cd ${utils_terminal_1.prettyPath(projectDir)}`)}`,
            `Run ${color_1.input('ionic serve')} within the app directory to see your app in the browser`,
            isCapacitor ?
                `Run ${color_1.input('ionic capacitor add')} to add a native iOS or Android project using Capacitor` :
                `Run ${color_1.input('ionic cordova platform add')} to add a native iOS or Android project using Cordova`,
            `Generate your app icon and splash screens using ${color_1.input(cordovaResCommand)}`,
            `Explore the Ionic docs for components, tutorials, and more: ${color_1.strong('https://ion.link/docs')}`,
            `Building an enterprise app? Ionic has Enterprise Support and Features: ${color_1.strong('https://ion.link/enterprise-edition')}`,
        ];
        if (linkConfirmed) {
            steps.push(`Push your code to Ionic Appflow to perform real-time updates, and more: ${color_1.input('git push ionic master')}`);
        }
        this.env.log.msg(`${color_1.strong('Your Ionic app is ready! Follow these next steps')}:\n${steps.map(s => ` - ${s}`).join('\n')}`);
    }
}
exports.StartCommand = StartCommand;
