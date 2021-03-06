"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const utils_process_1 = require("@ionic/utils-process");
const Debug = require("debug");
const lodash = require("lodash");
const build_1 = require("../../lib/build");
const color_1 = require("../../lib/color");
const errors_1 = require("../../lib/errors");
const project_1 = require("../../lib/integrations/cordova/project");
const utils_1 = require("../../lib/integrations/cordova/utils");
const native_run_1 = require("../../lib/native-run");
const serve_1 = require("../../lib/serve");
const logger_1 = require("../../lib/utils/logger");
const base_1 = require("./base");
const debug = Debug('ionic:commands:run');
const NATIVE_RUN_OPTIONS = [
    {
        name: 'native-run',
        summary: `Do not use ${color_1.input('native-run')} to run the app; use Cordova instead`,
        type: Boolean,
        default: true,
        groups: ['native-run'],
        hint: color_1.weak('[native-run]'),
    },
    {
        name: 'connect',
        summary: 'Tie the running app to the process',
        type: Boolean,
        groups: ['native-run'],
        hint: color_1.weak('[native-run] (--livereload)'),
    },
    {
        name: 'json',
        summary: `Output targets in JSON`,
        type: Boolean,
        groups: ["advanced" /* ADVANCED */, 'native-run'],
        hint: color_1.weak('[native-run] (--list)'),
    },
];
class RunCommand extends base_1.CordovaCommand {
    async getMetadata() {
        const groups = [];
        const exampleCommands = [
            ...base_1.CORDOVA_BUILD_EXAMPLE_COMMANDS,
            'android -l',
            'ios --livereload --external',
            'ios --livereload-url=http://localhost:8100',
        ].sort();
        let options = [
            {
                name: 'list',
                summary: 'List all available targets',
                type: Boolean,
                groups: ['cordova', 'cordova-cli', 'native-run'],
            },
            // Build Options
            {
                name: 'build',
                summary: 'Do not invoke Ionic build',
                type: Boolean,
                default: true,
            },
            ...build_1.COMMON_BUILD_COMMAND_OPTIONS.filter(o => !['engine', 'platform'].includes(o.name)),
            // Serve Options
            ...serve_1.COMMON_SERVE_COMMAND_OPTIONS.filter(o => !['livereload'].includes(o.name)).map(o => ({ ...o, hint: color_1.weak('(--livereload)') })),
            {
                name: 'livereload',
                summary: 'Spin up dev server to live-reload www files',
                type: Boolean,
                aliases: ['l'],
            },
            {
                name: 'livereload-url',
                summary: 'Provide a custom URL to the dev server',
                spec: { value: 'url' },
            },
        ];
        const footnotes = [
            {
                id: 'remote-debugging-docs',
                url: 'https://ionicframework.com/docs/developer-resources/developer-tips',
                shortUrl: 'https://ion.link/remote-debugging-docs',
            },
            {
                id: 'livereload-docs',
                url: 'https://ionicframework.com/docs/cli/livereload',
                shortUrl: 'https://ion.link/livereload-docs',
            },
            {
                id: 'native-run-repo',
                url: 'https://github.com/ionic-team/native-run',
            },
        ];
        const serveRunner = this.project && await this.project.getServeRunner();
        const buildRunner = this.project && await this.project.getBuildRunner();
        if (buildRunner) {
            const libmetadata = await buildRunner.getCommandMetadata();
            groups.push(...libmetadata.groups || []);
            options.push(...(libmetadata.options || []).filter(o => o.groups && o.groups.includes('cordova')));
            footnotes.push(...libmetadata.footnotes || []);
        }
        if (serveRunner) {
            const libmetadata = await serveRunner.getCommandMetadata();
            const existingOpts = options.map(o => o.name);
            groups.push(...libmetadata.groups || []);
            const runnerOpts = (libmetadata.options || [])
                .filter(o => !existingOpts.includes(o.name) && o.groups && o.groups.includes('cordova'))
                .map(o => ({ ...o, hint: `${o.hint ? `${o.hint} ` : ''}${color_1.weak('(--livereload)')}` }));
            options = lodash.uniqWith([...runnerOpts, ...options], (optionA, optionB) => optionA.name === optionB.name);
            footnotes.push(...libmetadata.footnotes || []);
        }
        // Cordova Options
        options.push(...base_1.CORDOVA_RUN_OPTIONS);
        // `native-run` Options
        options.push(...NATIVE_RUN_OPTIONS);
        return {
            name: 'run',
            type: 'project',
            summary: 'Run an Ionic project on a connected device',
            description: `
Build your app and deploy it to devices and emulators using this command. Optionally specify the ${color_1.input('--livereload')} option to use the dev server from ${color_1.input('ionic serve')} for livereload functionality.

This command will first use ${color_1.input('ionic build')} to build web assets (or ${color_1.input('ionic serve')} with the ${color_1.input('--livereload')} option). Then, ${color_1.input('cordova build')} is used to compile and prepare your app. Finally, the ${color_1.input('native-run')} utility[^native-run-repo] is used to run your app on a device. To use Cordova for this process instead, use the ${color_1.input('--no-native-run')} option.

If you have multiple devices and emulators, you can target a specific one with the ${color_1.input('--target')} option. You can list targets with ${color_1.input('--list')}.

For Android and iOS, you can setup Remote Debugging on your device with browser development tools using these docs[^remote-debugging-docs].

When using ${color_1.input('--livereload')} with hardware devices, remember that livereload needs an active connection between device and computer. In some scenarios, you may need to host the dev server on an external address using the ${color_1.input('--external')} option. See these docs[^livereload-docs] for more information.

Just like with ${color_1.input('ionic cordova build')}, you can pass additional options to the Cordova CLI using the ${color_1.input('--')} separator. To pass additional options to the dev server, consider using ${color_1.input('ionic serve')} separately and using the ${color_1.input('--livereload-url')} option.
      `,
            footnotes,
            exampleCommands,
            inputs: [
                {
                    name: 'platform',
                    summary: `The platform to run (e.g. ${['android', 'ios'].map(v => color_1.input(v)).join(', ')})`,
                    validators: [cli_framework_1.validators.required],
                },
            ],
            options,
            groups,
        };
    }
    async preRun(inputs, options, runinfo) {
        if (options['native-run']) {
            await this.checkNativeRun();
        }
        await this.preRunChecks(runinfo);
        const metadata = await this.getMetadata();
        if (options['noproxy']) {
            this.env.log.warn(`The ${color_1.input('--noproxy')} option has been deprecated. Please use ${color_1.input('--no-proxy')}.`);
            options['proxy'] = false;
        }
        if (options['x']) {
            options['proxy'] = false;
        }
        if (options['livereload-url']) {
            options['livereload'] = true;
        }
        if (!options['build'] && options['livereload']) {
            this.env.log.warn(`No livereload with ${color_1.input('--no-build')}.`);
            options['livereload'] = false;
        }
        // If we're using the emulate command, and if --device and --emulator are
        // not used, we should set the --emulator flag to mark intent.
        if (!options['device'] && !options['emulator'] && metadata.name === 'emulate') {
            options['emulator'] = true;
        }
        if (options['list']) {
            if (options['native-run']) {
                const args = native_run_1.createNativeRunListArgs(inputs, options);
                await this.runNativeRun(args);
            }
            else {
                const args = utils_1.filterArgumentsForCordova(metadata, options);
                await this.runCordova(['run', ...args.slice(1)], {});
            }
            throw new errors_1.FatalException('', 0);
        }
        if (!inputs[0]) {
            const p = await this.env.prompt({
                type: 'input',
                name: 'platform',
                message: `What platform would you like to run (${['android', 'ios'].map(v => color_1.input(v)).join(', ')}):`,
            });
            inputs[0] = p.trim();
        }
        const [platform] = inputs;
        if (platform && options['native-run'] && !native_run_1.SUPPORTED_PLATFORMS.includes(platform)) {
            this.env.log.warn(`${color_1.input(platform)} is not supported by ${color_1.input('native-run')}. Using Cordova to run the app.`);
            options['native-run'] = false;
        }
        // If we're using native-run, and if --device and --emulator are not used,
        // we can detect if hardware devices are plugged in and prefer them over
        // any virtual devices the host has.
        if (options['native-run'] && !options['device'] && !options['emulator'] && platform) {
            const platformTargets = await native_run_1.getNativeTargets(this.env, platform);
            const { devices } = platformTargets;
            debug(`Native platform devices: %O`, devices);
            if (devices.length > 0) {
                this.env.log.info(`Hardware device(s) found for ${color_1.input(platform)}. Using ${color_1.input('--device')}.`);
                options['device'] = true;
            }
        }
        await this.checkForPlatformInstallation(platform);
    }
    async run(inputs, options) {
        try {
            if (options['livereload']) {
                await this.runServeDeploy(inputs, options);
            }
            else {
                await this.runBuildDeploy(inputs, options);
            }
        }
        catch (e) {
            if (e instanceof errors_1.RunnerException) {
                throw new errors_1.FatalException(e.message);
            }
            throw e;
        }
    }
    async runServeDeploy(inputs, options) {
        const { loadCordovaConfig } = await Promise.resolve().then(() => require('../../lib/integrations/cordova/config'));
        const metadata = await this.getMetadata();
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input(`ionic cordova ${metadata.name}`)} outside a project directory.`);
        }
        const runner = await this.project.requireServeRunner();
        const runnerOpts = runner.createOptionsFromCommandLine(inputs, utils_1.generateOptionsForCordovaBuild(metadata, inputs, options));
        /**
         * With the --livereload-url option, this command won't perform a serve. If
         * this is the case, details will be undefined.
         */
        let details;
        let serverUrl = options['livereload-url'] ? String(options['livereload-url']) : undefined;
        if (!serverUrl) {
            details = await runner.run(runnerOpts);
            if (details.externallyAccessible === false && !options['native-run']) {
                const extra = serve_1.LOCAL_ADDRESSES.includes(details.externalAddress) ? '\nEnsure you have proper port forwarding setup from your device to your computer.' : '';
                this.env.log.warn(`Your device or emulator may not be able to access ${color_1.strong(details.externalAddress)}.${extra}\n\n`);
            }
            serverUrl = `${details.protocol || 'http'}://${details.externalAddress}:${details.port}`;
        }
        const conf = await loadCordovaConfig(this.integration);
        utils_process_1.onBeforeExit(async () => {
            conf.resetContentSrc();
            await conf.save();
        });
        conf.writeContentSrc(serverUrl);
        await conf.save();
        const cordovalogws = logger_1.createPrefixedWriteStream(this.env.log, color_1.weak(`[cordova]`));
        const buildOpts = { stream: cordovalogws };
        // ignore very verbose compiler output on stdout unless --verbose
        buildOpts.stdio = options['verbose'] ? 'inherit' : ['pipe', 'ignore', 'pipe'];
        if (options['native-run']) {
            const [platform] = inputs;
            await this.runCordova(utils_1.filterArgumentsForCordova({ ...metadata, name: 'build' }, options), buildOpts);
            const packagePath = await project_1.getPackagePath(this.integration.root, conf.getProjectInfo().name, platform, { emulator: !options['device'], release: !!options['release'] });
            const forwardedPorts = details ? runner.getUsedPorts(runnerOpts, details) : [];
            await this.runNativeRun(native_run_1.createNativeRunArgs({ packagePath, platform, forwardedPorts }, options));
        }
        else {
            await this.runCordova(utils_1.filterArgumentsForCordova(metadata, options), buildOpts);
            await utils_process_1.sleepForever();
        }
    }
    async runBuildDeploy(inputs, options) {
        const { loadCordovaConfig } = await Promise.resolve().then(() => require('../../lib/integrations/cordova/config'));
        const metadata = await this.getMetadata();
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input(`ionic cordova ${metadata.name}`)} outside a project directory.`);
        }
        if (options.build) {
            try {
                const runner = await this.project.requireBuildRunner();
                const runnerOpts = runner.createOptionsFromCommandLine(inputs, utils_1.generateOptionsForCordovaBuild(metadata, inputs, options));
                await runner.run(runnerOpts);
            }
            catch (e) {
                if (e instanceof errors_1.RunnerException) {
                    throw new errors_1.FatalException(e.message);
                }
                throw e;
            }
        }
        if (options['native-run']) {
            const conf = await loadCordovaConfig(this.integration);
            const [platform] = inputs;
            await this.runCordova(utils_1.filterArgumentsForCordova({ ...metadata, name: 'build' }, options), { stdio: 'inherit' });
            const packagePath = await project_1.getPackagePath(this.integration.root, conf.getProjectInfo().name, platform, { emulator: !options['device'], release: !!options['release'] });
            await this.runNativeRun(native_run_1.createNativeRunArgs({ packagePath, platform }, { ...options, connect: false }));
        }
        else {
            await this.runCordova(utils_1.filterArgumentsForCordova(metadata, options), { stdio: 'inherit' });
        }
    }
    async checkNativeRun() {
        await native_run_1.checkNativeRun(this.env);
    }
    async runNativeRun(args) {
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input('ionic cordova run/emulate')} outside a project directory.`);
        }
        await native_run_1.runNativeRun(this.env, args, { cwd: this.integration.root });
    }
}
exports.RunCommand = RunCommand;
