"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Integration = void 0;
const utils_fs_1 = require("@ionic/utils-fs");
const chalk = require("chalk");
const Debug = require("debug");
const lodash = require("lodash");
const os = require("os");
const path = require("path");
const __1 = require("../");
const color_1 = require("../../color");
const utils_1 = require("./utils");
const debug = Debug('ionic:lib:integrations:cordova');
class Integration extends __1.BaseIntegration {
    constructor() {
        super(...arguments);
        this.name = 'cordova';
        this.summary = 'Target native iOS and Android with Apache Cordova';
        this.archiveUrl = 'https://d2ql0qc7j8u4b2.cloudfront.net/integration-cordova.tar.gz';
    }
    get config() {
        return new __1.IntegrationConfig(this.e.project.filePath, { pathPrefix: [...this.e.project.pathPrefix, 'integrations', this.name] });
    }
    async add(details) {
        await utils_1.checkForUnsupportedProject(this.e.project.type);
        const handlers = {
            conflictHandler: async (f, stats) => {
                const isDirectory = stats.isDirectory();
                const filename = `${path.basename(f)}${isDirectory ? '/' : ''}`;
                const type = isDirectory ? 'directory' : 'file';
                const confirm = await this.e.prompt({
                    type: 'confirm',
                    name: 'confirm',
                    message: `The ${color_1.ancillary(filename)} ${type} exists in project. Overwrite?`,
                    default: false,
                });
                return confirm;
            },
            onFileCreate: f => {
                if (!details.quiet) {
                    this.e.log.msg(`${chalk.green('CREATE')} ${f}`);
                }
            },
        };
        const onFileCreate = handlers.onFileCreate ? handlers.onFileCreate : lodash.noop;
        const conflictHandler = handlers.conflictHandler ? handlers.conflictHandler : async () => false;
        const { createRequest, download } = await Promise.resolve().then(() => require('../../utils/http'));
        const { tar } = await Promise.resolve().then(() => require('../../utils/archive'));
        this.e.log.info(`Downloading integration ${color_1.input(this.name)}`);
        const tmpdir = path.resolve(os.tmpdir(), `ionic-integration-${this.name}`);
        // TODO: etag
        if (await utils_fs_1.pathExists(tmpdir)) {
            await utils_fs_1.remove(tmpdir);
        }
        await utils_fs_1.mkdirp(tmpdir);
        const ws = tar.extract({ cwd: tmpdir });
        const { req } = await createRequest('GET', this.archiveUrl, this.e.config.getHTTPConfig());
        await download(req, ws, {});
        const contents = await utils_fs_1.readdirSafe(tmpdir);
        const blacklist = [];
        debug(`Integration files downloaded to ${color_1.strong(tmpdir)} (files: ${contents.map(f => color_1.strong(f)).join(', ')})`);
        for (const f of contents) {
            const projectf = path.resolve(this.e.project.directory, f);
            try {
                const stats = await utils_fs_1.stat(projectf);
                const overwrite = await conflictHandler(projectf, stats);
                if (!overwrite) {
                    blacklist.push(f);
                }
            }
            catch (e) {
                if (e.code !== 'ENOENT') {
                    throw e;
                }
            }
        }
        this.e.log.info(`Copying integrations files to project`);
        debug(`Blacklist: ${blacklist.map(f => color_1.strong(f)).join(', ')}`);
        await utils_fs_1.mkdirp(details.root);
        await utils_fs_1.copy(tmpdir, details.root, {
            filter: f => {
                if (f === tmpdir) {
                    return true;
                }
                const projectf = f.substring(tmpdir.length + 1);
                for (const item of blacklist) {
                    if (item.slice(-1) === '/' && `${projectf}/` === item) {
                        return false;
                    }
                    if (projectf.startsWith(item)) {
                        return false;
                    }
                }
                onFileCreate(projectf);
                return true;
            },
        });
        await super.add(details);
    }
    async getCordovaConfig() {
        try {
            return await this.requireConfig();
        }
        catch (e) {
            // ignore
        }
    }
    async requireConfig() {
        const { loadCordovaConfig } = await Promise.resolve().then(() => require('./config'));
        const integration = this.e.project.requireIntegration('cordova');
        const conf = await loadCordovaConfig(integration);
        return conf;
    }
    async getInfo() {
        const { getAndroidSdkToolsVersion } = await Promise.resolve().then(() => require('./android'));
        const [cordovaVersion, cordovaPlatforms, cordovaPlugins, xcode, iosDeploy, iosSim, androidSdkToolsVersion,] = await (Promise.all([
            this.getCordovaVersion(),
            this.getCordovaPlatformVersions(),
            this.getCordovaPluginVersions(),
            this.getXcodebuildVersion(),
            this.getIOSDeployVersion(),
            this.getIOSSimVersion(),
            getAndroidSdkToolsVersion(),
        ]));
        const info = [
            { group: 'cordova', name: 'Cordova CLI', key: 'cordova_version', value: cordovaVersion || 'not installed' },
            { group: 'cordova', name: 'Cordova Platforms', key: 'cordova_platforms', value: cordovaPlatforms },
            { group: 'cordova', name: 'Cordova Plugins', value: cordovaPlugins },
        ];
        if (xcode) {
            info.push({ group: 'system', name: 'Xcode', key: 'xcode_version', value: xcode });
        }
        if (iosDeploy) {
            info.push({ group: 'system', name: 'ios-deploy', value: iosDeploy });
        }
        if (iosSim) {
            info.push({ group: 'system', name: 'ios-sim', value: iosSim });
        }
        if (androidSdkToolsVersion) {
            info.push({ group: 'system', name: 'Android SDK Tools', key: 'android_sdk_version', value: androidSdkToolsVersion });
        }
        const conf = await this.getCordovaConfig();
        if (conf) {
            const bundleId = conf.getBundleId();
            info.push({ group: 'cordova', name: 'Bundle ID', key: 'bundle_id', value: bundleId || 'unknown', hidden: true });
        }
        return info;
    }
    async personalize({ name, packageId }) {
        const conf = await this.requireConfig();
        conf.setName(name);
        if (packageId) {
            conf.setBundleId(packageId);
        }
        await conf.save();
    }
    async getCordovaVersion() {
        try {
            const integration = this.e.project.requireIntegration('cordova');
            return this.e.shell.cmdinfo('cordova', ['-v', '--no-telemetry', '--no-update-notifier'], { cwd: integration.root });
        }
        catch (e) {
            debug('Error while getting Cordova version: %O', e);
        }
    }
    async getCordovaPlatformVersions() {
        try {
            const integration = this.e.project.requireIntegration('cordova');
            const output = await this.e.shell.output('cordova', ['platform', 'ls', '--no-telemetry', '--no-update-notifier'], { cwd: integration.root, showCommand: false });
            const platforms = output
                .replace('Installed platforms:', '')
                .replace(/Available platforms[\s\S]+/, '')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('.'));
            if (platforms.length === 0) {
                return 'none';
            }
            return platforms.join(', ');
        }
        catch (e) {
            debug('Error while getting Cordova platforms: %O', e);
            return 'not available';
        }
    }
    async getCordovaPluginVersions() {
        const whitelist = [
            /^cordova-plugin-ionic$/,
            /^cordova-plugin-ionic-.+/,
        ];
        try {
            const integration = this.e.project.requireIntegration('cordova');
            const output = await this.e.shell.output('cordova', ['plugin', 'ls', '--no-telemetry', '--no-update-notifier'], { cwd: integration.root, showCommand: false });
            const pluginRe = /^([a-z-]+)\s+(\d\.\d\.\d).+$/;
            const plugins = output
                .split('\n')
                .map(l => l.trim().match(pluginRe))
                .filter((l) => l !== null)
                .map(m => [m[1], m[2]]);
            const whitelistedPlugins = plugins
                .filter(([plugin, version]) => whitelist.some(re => re.test(plugin)))
                .map(([plugin, version]) => `${plugin} ${version}`);
            const count = plugins.length - whitelistedPlugins.length;
            if (whitelistedPlugins.length === 0) {
                return `no whitelisted plugins (${count} plugins total)`;
            }
            return `${whitelistedPlugins.join(', ')}${count > 0 ? `, (and ${count} other plugins)` : ''}`;
        }
        catch (e) {
            debug('Error while getting Cordova plugins: %O', e);
            return 'not available';
        }
    }
    async getXcodebuildVersion() {
        return this.e.shell.cmdinfo('xcodebuild', ['-version']);
    }
    async getIOSDeployVersion() {
        return this.e.shell.cmdinfo('ios-deploy', ['--version']);
    }
    async getIOSSimVersion() {
        return this.e.shell.cmdinfo('ios-sim', ['--version']);
    }
}
exports.Integration = Integration;
