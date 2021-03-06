"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VueServeCLI = exports.VueServeRunner = void 0;
const cli_framework_output_1 = require("@ionic/cli-framework-output");
const utils_network_1 = require("@ionic/utils-network");
const color_1 = require("../../color");
const serve_1 = require("../../serve");
class VueServeRunner extends serve_1.ServeRunner {
    constructor(e) {
        super();
        this.e = e;
    }
    async getCommandMetadata() {
        return {};
    }
    modifyOpenUrl(url, _options) {
        return url;
    }
    async serveProject(options) {
        const [externalIP, availableInterfaces] = await this.selectExternalIP(options);
        const port = options.port = await utils_network_1.findClosestOpenPort(options.port);
        const vueScripts = new VueServeCLI(this.e);
        await vueScripts.serve(options);
        return {
            custom: vueScripts.resolvedProgram !== vueScripts.program,
            protocol: options.https ? 'https' : 'http',
            localAddress: 'localhost',
            externalAddress: externalIP,
            externalNetworkInterfaces: availableInterfaces,
            port,
            externallyAccessible: ![serve_1.BIND_ALL_ADDRESS, ...serve_1.LOCAL_ADDRESSES].includes(externalIP),
        };
    }
}
exports.VueServeRunner = VueServeRunner;
class VueServeCLI extends serve_1.ServeCLI {
    constructor() {
        super(...arguments);
        this.name = 'Vue CLI Service';
        this.pkg = '@vue/cli-service';
        this.program = 'vue-cli-service';
        this.prefix = 'vue-cli-service';
        this.script = serve_1.SERVE_SCRIPT;
        this.chunks = 0;
    }
    async serve(options) {
        this.on('compile', chunks => {
            if (chunks > 0) {
                this.e.log.info(`... and ${color_1.strong(chunks.toString())} additional chunks`);
            }
        });
        return super.serve(options);
    }
    stdoutFilter(line) {
        if (this.resolvedProgram !== this.program) {
            return super.stdoutFilter(line);
        }
        const strippedLine = cli_framework_output_1.stripAnsi(line);
        const compileMsgs = ['Compiled successfully', 'Compiled with warnings', 'Failed to compile'];
        if (compileMsgs.some(msg => strippedLine.includes(msg))) {
            this.emit('ready');
            return false;
        }
        if (strippedLine.match(/.*chunk\s{\d+}.+/)) {
            this.chunks++;
            return false;
        }
        if (strippedLine.includes('Compiled successfully')) {
            this.emit('compile', this.chunks);
            this.chunks = 0;
        }
        // const endBannerMsgs = ['development build', 'production build']
        // if (endBannerMsgs.some(msg => strippedLine.includes(msg))) {
        //   return false;
        // }
        return true;
    }
    stderrFilter(line) {
        if (this.resolvedProgram !== this.program) {
            return super.stderrFilter(line);
        }
        const strippedLine = cli_framework_output_1.stripAnsi(line);
        if (strippedLine.includes('webpack.Progress')) {
            return false;
        }
        return true;
    }
    async buildArgs(_options) {
        const { pkgManagerArgs } = await Promise.resolve().then(() => require('../../utils/npm'));
        if (this.resolvedProgram === this.program) {
            return ['serve'];
        }
        else {
            const [, ...pkgArgs] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script });
            return pkgArgs;
        }
    }
    async buildEnvVars(options) {
        const env = {};
        // // Vue CLI binds to `localhost` by default, but if specified it prints a
        // // warning, so don't set `HOST` if the host is set to `localhost`.
        if (options.host !== serve_1.DEFAULT_ADDRESS) {
            env.HOST = options.host;
        }
        env.PORT = String(options.port);
        env.HTTPS = options.https ? 'true' : 'false';
        return { ...await super.buildEnvVars(options), ...env };
    }
}
exports.VueServeCLI = VueServeCLI;
