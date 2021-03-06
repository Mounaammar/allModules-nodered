"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Integration = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const utils_fs_1 = require("@ionic/utils-fs");
const utils_terminal_1 = require("@ionic/utils-terminal");
const chalk = require("chalk");
const Debug = require("debug");
const lodash = require("lodash");
const path = require("path");
const debug = Debug('ionic:lib:integrations:capacitor');
const __1 = require("../");
const color_1 = require("../../color");
const npm_1 = require("../../utils/npm");
const config_1 = require("./config");
class Integration extends __1.BaseIntegration {
    constructor() {
        super(...arguments);
        this.name = 'capacitor';
        this.summary = `Target native iOS and Android with Capacitor, Ionic's new native layer`;
        this.archiveUrl = undefined;
        this.getCapacitorCLIVersion = lodash.memoize(async () => {
            return this.e.shell.cmdinfo('capacitor', ['--version'], { cwd: this.root });
        });
        this.getCapacitorCLIConfig = lodash.memoize(async () => {
            const args = ['config', '--json'];
            debug('Getting config with Capacitor CLI: %O', args);
            const output = await this.e.shell.cmdinfo('capacitor', args, { cwd: this.root });
            if (!output) {
                debug('Could not get config from Capacitor CLI (probably old version)');
                return;
            }
            return JSON.parse(output);
        });
        this.getCapacitorConfig = lodash.memoize(async () => {
            const cli = await this.getCapacitorCLIConfig();
            if (cli) {
                debug('Loaded Capacitor config!');
                return cli.app.extConfig;
            }
            // fallback to reading capacitor.config.json if it exists
            const confPath = this.getCapacitorConfigJsonPath();
            if (!(await utils_fs_1.pathExists(confPath))) {
                debug('Capacitor config file does not exist at %O', confPath);
                debug('Failed to load Capacitor config');
                return;
            }
            const conf = new config_1.CapacitorJSONConfig(confPath);
            const extConfig = conf.c;
            debug('Loaded Capacitor config!');
            return extConfig;
        });
    }
    get config() {
        return new __1.IntegrationConfig(this.e.project.filePath, { pathPrefix: [...this.e.project.pathPrefix, 'integrations', this.name] });
    }
    get root() {
        return this.config.get('root', this.e.project.directory);
    }
    async add(details) {
        const confPath = this.getCapacitorConfigJsonPath();
        if (await utils_fs_1.pathExists(confPath)) {
            this.e.log.nl();
            this.e.log.warn(`Capacitor already exists in project.\n` +
                `Since the Capacitor config already exists (${color_1.strong(utils_terminal_1.prettyPath(confPath))}), the Capacitor integration has been ${chalk.green('enabled')}.\n\n` +
                `You can re-integrate this project by doing the following:\n\n` +
                `- Run ${color_1.input(`ionic integrations disable ${this.name}`)}\n` +
                `- Remove the ${color_1.strong(utils_terminal_1.prettyPath(confPath))} file\n` +
                `- Run ${color_1.input(`ionic integrations enable ${this.name} --add`)}\n`);
        }
        else {
            let name = this.e.project.config.get('name');
            let packageId = 'io.ionic.starter';
            let webDir = await this.e.project.getDefaultDistDir();
            const options = [];
            if (details.enableArgs && details.enableArgs.length > 0) {
                const parsedArgs = cli_framework_1.parseArgs(details.enableArgs);
                name = parsedArgs._[0] || name;
                packageId = parsedArgs._[1] || packageId;
                if (parsedArgs['web-dir']) {
                    webDir = parsedArgs['web-dir'];
                }
            }
            options.push('--web-dir', webDir);
            await this.installCapacitorCore();
            await this.installCapacitorCLI();
            await this.installCapacitorPlugins();
            await utils_fs_1.mkdirp(details.root);
            await this.e.shell.run('capacitor', ['init', name, packageId, ...options], { cwd: details.root });
        }
        await super.add(details);
    }
    getCapacitorConfigJsonPath() {
        return path.resolve(this.root, 'capacitor.config.json');
    }
    async installCapacitorCore() {
        const [manager, ...managerArgs] = await npm_1.pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: '@capacitor/core@latest' });
        await this.e.shell.run(manager, managerArgs, { cwd: this.root });
    }
    async installCapacitorCLI() {
        const [manager, ...managerArgs] = await npm_1.pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: '@capacitor/cli@latest', saveDev: true });
        await this.e.shell.run(manager, managerArgs, { cwd: this.root });
    }
    async installCapacitorPlugins() {
        const [manager, ...managerArgs] = await npm_1.pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: ['@capacitor/haptics', '@capacitor/app', '@capacitor/keyboard', '@capacitor/status-bar'] });
        await this.e.shell.run(manager, managerArgs, { cwd: this.root });
    }
    async personalize({ name, packageId }) {
        const confPath = this.getCapacitorConfigJsonPath();
        if (await utils_fs_1.pathExists(confPath)) {
            const conf = new config_1.CapacitorJSONConfig(confPath);
            conf.set('appName', name);
            if (packageId) {
                conf.set('appId', packageId);
            }
        }
    }
    async getInfo() {
        const conf = await this.getCapacitorConfig();
        const bundleId = conf === null || conf === void 0 ? void 0 : conf.appId;
        const [[capacitorCorePkg, capacitorCorePkgPath], capacitorCLIVersion, [capacitorIOSPkg, capacitorIOSPkgPath], [capacitorAndroidPkg, capacitorAndroidPkgPath],] = await (Promise.all([
            this.e.project.getPackageJson('@capacitor/core'),
            this.getCapacitorCLIVersion(),
            this.e.project.getPackageJson('@capacitor/ios'),
            this.e.project.getPackageJson('@capacitor/android'),
        ]));
        const info = [
            {
                group: 'capacitor',
                name: 'Capacitor CLI',
                key: 'capacitor_cli_version',
                value: capacitorCLIVersion || 'not installed',
            },
            {
                group: 'capacitor',
                name: '@capacitor/core',
                key: 'capacitor_core_version',
                value: capacitorCorePkg ? capacitorCorePkg.version : 'not installed',
                path: capacitorCorePkgPath,
            },
            {
                group: 'capacitor',
                name: '@capacitor/ios',
                key: 'capacitor_ios_version',
                value: capacitorIOSPkg ? capacitorIOSPkg.version : 'not installed',
                path: capacitorIOSPkgPath,
            },
            {
                group: 'capacitor',
                name: '@capacitor/android',
                key: 'capacitor_android_version',
                value: capacitorAndroidPkg ? capacitorAndroidPkg.version : 'not installed',
                path: capacitorAndroidPkgPath,
            },
            {
                group: 'capacitor',
                name: 'Bundle ID',
                key: 'bundle_id',
                value: bundleId || 'unknown',
                hidden: true,
            },
        ];
        return info;
    }
}
exports.Integration = Integration;
