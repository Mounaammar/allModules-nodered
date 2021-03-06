"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CordovaCommand = exports.CORDOVA_BUILD_EXAMPLE_COMMANDS = exports.CORDOVA_RUN_OPTIONS = exports.CORDOVA_COMPILE_OPTIONS = void 0;
const utils_fs_1 = require("@ionic/utils-fs");
const utils_subprocess_1 = require("@ionic/utils-subprocess");
const utils_terminal_1 = require("@ionic/utils-terminal");
const lodash = require("lodash");
const path = require("path");
const color_1 = require("../../lib/color");
const command_1 = require("../../lib/command");
const errors_1 = require("../../lib/errors");
const executor_1 = require("../../lib/executor");
const npm_1 = require("../../lib/utils/npm");
exports.CORDOVA_COMPILE_OPTIONS = [
    {
        name: 'debug',
        summary: 'Mark as a debug build',
        type: Boolean,
        groups: ['cordova', 'cordova-cli'],
        hint: color_1.weak('[cordova]'),
    },
    {
        name: 'release',
        summary: 'Mark as a release build',
        type: Boolean,
        groups: ['cordova', 'cordova-cli'],
        hint: color_1.weak('[cordova]'),
    },
    {
        name: 'device',
        summary: 'Deploy build to a device',
        type: Boolean,
        groups: ['cordova', 'cordova-cli', 'native-run'],
        hint: color_1.weak('[cordova/native-run]'),
    },
    {
        name: 'emulator',
        summary: 'Deploy build to an emulator',
        type: Boolean,
        groups: ['cordova', 'cordova-cli', 'native-run'],
        hint: color_1.weak('[cordova/native-run]'),
    },
    {
        name: 'buildConfig',
        summary: 'Use the specified build configuration',
        groups: ["advanced" /* ADVANCED */, 'cordova', 'cordova-cli'],
        hint: color_1.weak('[cordova]'),
        spec: { value: 'file' },
    },
];
exports.CORDOVA_RUN_OPTIONS = [
    ...exports.CORDOVA_COMPILE_OPTIONS,
    {
        name: 'target',
        summary: `Deploy build to a device (use ${color_1.input('--list')} to see all)`,
        type: String,
        groups: ["advanced" /* ADVANCED */, 'cordova', 'cordova-cli', 'native-run'],
        hint: color_1.weak('[cordova/native-run]'),
    },
];
exports.CORDOVA_BUILD_EXAMPLE_COMMANDS = [
    'ios',
    'ios --prod --release',
    'ios --prod --release -- --developmentTeam="ABCD" --codeSignIdentity="iPhone Developer" --packageType="app-store"',
    'ios --buildConfig=build.json',
    'ios --prod --release --buildConfig=build.json',
    'android',
    'android --prod --release -- -- --keystore=filename.keystore --alias=myalias',
    'android --prod --release -- -- --minSdkVersion=21',
    'android --prod --release -- -- --versionCode=55',
    'android --prod --release -- -- --gradleArg=-PcdvBuildMultipleApks=true',
    'android --buildConfig=build.json',
    'android --prod --release --buildConfig=build.json',
];
class CordovaCommand extends command_1.Command {
    get integration() {
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot use Cordova outside a project directory.`);
        }
        if (!this._integration) {
            this._integration = this.project.requireIntegration('cordova');
        }
        return this._integration;
    }
    async checkCordova(runinfo) {
        if (!this.project) {
            throw new errors_1.FatalException('Cannot use Cordova outside a project directory.');
        }
        const cordova = this.project.getIntegration('cordova');
        if (!cordova) {
            const capacitor = this.project.getIntegration('capacitor');
            if (capacitor && capacitor.enabled) {
                throw new errors_1.FatalException(`Refusing to use Cordova inside a Capacitor project.\n` +
                    `Are you looking for the ${color_1.input('ionic capacitor')} commands? See ${color_1.input('ionic capacitor --help')}\n\n` +
                    `If you are switching from Capacitor to Cordova, run: ${color_1.input('ionic integrations disable capacitor')}\n`);
            }
            const { confirmCordovaUsage } = await Promise.resolve().then(() => require('../../lib/integrations/cordova/utils'));
            const confirm = await confirmCordovaUsage(this.env);
            if (!confirm) {
                throw new errors_1.FatalException('', 0);
            }
            await executor_1.runCommand(runinfo, ['integrations', 'enable', 'cordova']);
        }
    }
    async preRunChecks(runinfo) {
        const { checkForUnsupportedProject } = await Promise.resolve().then(() => require('../../lib/integrations/cordova/utils'));
        const { loadCordovaConfig } = await Promise.resolve().then(() => require('../../lib/integrations/cordova/config'));
        if (!this.project) {
            throw new errors_1.FatalException('Cannot use Cordova outside a project directory.');
        }
        const parts = executor_1.getFullCommandParts(runinfo.location);
        const alias = lodash.last(parts);
        await checkForUnsupportedProject(this.project.type, alias);
        await this.checkCordova(runinfo);
        // Check for www folder
        if (this.project.directory) {
            const wwwPath = path.join(this.integration.root, 'www');
            const wwwExists = await utils_fs_1.pathExists(wwwPath); // TODO: hard-coded
            if (!wwwExists) {
                const tasks = this.createTaskChain();
                tasks.next(`Creating ${color_1.strong(utils_terminal_1.prettyPath(wwwPath))} directory for you`);
                await utils_fs_1.mkdirp(wwwPath);
                tasks.end();
            }
        }
        const conf = await loadCordovaConfig(this.integration);
        conf.resetContentSrc();
        await conf.save();
    }
    async runCordova(argList, { fatalOnNotFound = false, truncateErrorOutput = 5000, ...options } = {}) {
        if (!this.project) {
            throw new errors_1.FatalException('Cannot use Cordova outside a project directory.');
        }
        try {
            await this.env.shell.run('cordova', argList, { fatalOnNotFound, truncateErrorOutput, cwd: this.integration.root, ...options });
        }
        catch (e) {
            if (e instanceof utils_subprocess_1.SubprocessError) {
                if (e.code === utils_subprocess_1.ERROR_COMMAND_NOT_FOUND) {
                    const installArgs = await npm_1.pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install', pkg: 'cordova', global: true });
                    throw new errors_1.FatalException(`The Cordova CLI was not found on your PATH. Please install Cordova globally:\n` +
                        `${color_1.input(installArgs.join(' '))}\n`);
                }
                if (e.code === utils_subprocess_1.ERROR_SIGNAL_EXIT) {
                    return;
                }
            }
            if (options.fatalOnError) {
                this.env.log.nl();
                this.env.log.error('Cordova encountered an error.\nYou may get more insight by running the Cordova command above directly.\n');
            }
            throw e;
        }
    }
    async checkForPlatformInstallation(platform, { promptToInstall = !['android', 'ios'].includes(platform), promptToInstallRefusalMsg = `Cannot run this command for the ${color_1.input(platform)} platform unless it is installed.` } = {}) {
        if (!this.project) {
            throw new errors_1.FatalException('Cannot use Cordova outside a project directory.');
        }
        if (platform) {
            const { getPlatforms } = await Promise.resolve().then(() => require('../../lib/integrations/cordova/project'));
            const { confirmCordovaBrowserUsage } = await Promise.resolve().then(() => require('../../lib/integrations/cordova/utils'));
            const platforms = await getPlatforms(this.integration.root);
            if (!platforms.includes(platform)) {
                if (platform === 'browser') {
                    const confirm = await confirmCordovaBrowserUsage(this.env);
                    if (!confirm) {
                        throw new errors_1.FatalException(promptToInstallRefusalMsg);
                    }
                }
                const confirm = promptToInstall ? await this.env.prompt({
                    message: `Platform ${color_1.input(platform)} is not installed! Would you like to install it?`,
                    type: 'confirm',
                    name: 'confirm',
                }) : true;
                if (confirm) {
                    await this.runCordova(['platform', 'add', platform, '--save']);
                }
                else {
                    throw new errors_1.FatalException(promptToInstallRefusalMsg);
                }
            }
        }
    }
}
exports.CordovaCommand = CordovaCommand;
