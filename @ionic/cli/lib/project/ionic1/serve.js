"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ionic1ServeRunner = void 0;
const string_1 = require("@ionic/cli-framework/utils/string");
const serve_1 = require("../../serve");
const common_1 = require("../common");
class Ionic1ServeRunner extends serve_1.ServeRunner {
    constructor(e) {
        super();
        this.e = e;
    }
    async getCommandMetadata() {
        return {
            options: [
                {
                    name: 'consolelogs',
                    summary: 'Print app console logs to Ionic CLI',
                    type: Boolean,
                    groups: ['cordova'],
                    aliases: ['c'],
                },
                {
                    name: 'serverlogs',
                    summary: 'Print dev server logs to Ionic CLI',
                    type: Boolean,
                    aliases: ['s'],
                    groups: ["hidden" /* HIDDEN */, 'cordova'],
                },
                {
                    name: 'livereload-port',
                    summary: 'Use specific port for live-reload',
                    default: serve_1.DEFAULT_LIVERELOAD_PORT.toString(),
                    aliases: ['r'],
                    groups: ["advanced" /* ADVANCED */, 'cordova'],
                    spec: { value: 'port' },
                },
                {
                    name: 'dev-logger-port',
                    summary: 'Use specific port for dev server communication',
                    default: serve_1.DEFAULT_DEV_LOGGER_PORT.toString(),
                    groups: ["advanced" /* ADVANCED */, 'cordova'],
                    spec: { value: 'port' },
                },
                {
                    name: 'proxy',
                    summary: 'Do not add proxies',
                    type: Boolean,
                    default: true,
                    groups: ["advanced" /* ADVANCED */, 'cordova'],
                },
            ],
            exampleCommands: [
                '-c',
            ],
        };
    }
    createOptionsFromCommandLine(inputs, options) {
        const baseOptions = super.createOptionsFromCommandLine(inputs, options);
        const livereloadPort = string_1.str2num(options['livereload-port'], serve_1.DEFAULT_LIVERELOAD_PORT);
        const notificationPort = string_1.str2num(options['dev-logger-port'], serve_1.DEFAULT_DEV_LOGGER_PORT);
        return {
            ...baseOptions,
            consolelogs: options['consolelogs'] ? true : false,
            serverlogs: options['serverlogs'] ? true : false,
            livereloadPort,
            notificationPort,
        };
    }
    modifyOpenUrl(url, options) {
        return `${url}${options.browserOption ? options.browserOption : ''}${options.platform ? `?ionicplatform=${options.platform}` : ''}`;
    }
    async serveProject(options) {
        const [externalIP, availableInterfaces] = await this.selectExternalIP(options);
        const { port, livereloadPort, notificationPort } = await common_1.findOpenIonicPorts(options.host, options);
        options.port = port;
        options.livereloadPort = livereloadPort;
        options.notificationPort = notificationPort;
        const v1 = new Ionic1ServeCLI(this.e);
        await v1.serve(options);
        return {
            custom: v1.resolvedProgram !== v1.program,
            protocol: 'http',
            localAddress: 'localhost',
            externalAddress: externalIP,
            externalNetworkInterfaces: availableInterfaces,
            port,
            externallyAccessible: ![serve_1.BIND_ALL_ADDRESS, ...serve_1.LOCAL_ADDRESSES].includes(externalIP),
        };
    }
    getUsedPorts(options, details) {
        return [
            ...super.getUsedPorts(options, details),
            ...options.livereloadPort ? [options.livereloadPort] : [],
            ...options.notificationPort ? [options.notificationPort] : [],
        ];
    }
}
exports.Ionic1ServeRunner = Ionic1ServeRunner;
class Ionic1ServeCLI extends serve_1.ServeCLI {
    constructor() {
        super(...arguments);
        this.name = 'Ionic 1 Toolkit';
        this.pkg = '@ionic/v1-toolkit';
        this.program = 'ionic-v1';
        this.prefix = 'v1';
        this.script = serve_1.SERVE_SCRIPT;
    }
    stdoutFilter(line) {
        if (this.resolvedProgram !== this.program) {
            return super.stdoutFilter(line);
        }
        if (line.includes('server running')) {
            this.emit('ready');
            return false;
        }
        return true;
    }
    async buildArgs(options) {
        const { pkgManagerArgs } = await Promise.resolve().then(() => require('../../utils/npm'));
        const args = [
            `--host=${options.host}`,
            `--port=${String(options.port)}`,
            `--livereload-port=${String(options.livereloadPort)}`,
            `--dev-port=${String(options.notificationPort)}`,
            `--engine=${options.engine}`,
        ];
        if (options.platform) {
            args.push(`--platform=${options.platform}`);
        }
        if (options.consolelogs) {
            args.push('-c');
        }
        if (this.resolvedProgram === this.program) {
            return ['serve', ...args];
        }
        else {
            const [, ...pkgArgs] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script, scriptArgs: [...args] });
            return pkgArgs;
        }
    }
}
