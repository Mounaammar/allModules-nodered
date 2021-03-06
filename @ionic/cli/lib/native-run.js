"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNativeTargets = exports.findNativeRun = exports.checkNativeRun = exports.runNativeRun = exports.createNativeRunListArgs = exports.createNativeRunArgs = exports.SUPPORTED_PLATFORMS = void 0;
const utils_process_1 = require("@ionic/utils-process");
const utils_subprocess_1 = require("@ionic/utils-subprocess");
const color_1 = require("./color");
const errors_1 = require("./errors");
const logger_1 = require("./utils/logger");
const npm_1 = require("./utils/npm");
exports.SUPPORTED_PLATFORMS = ['ios', 'android'];
function createNativeRunArgs({ packagePath, platform, forwardedPorts = [] }, options) {
    const opts = [platform, '--app', packagePath];
    const target = options['target'] ? String(options['target']) : undefined;
    if (target) {
        opts.push('--target', target);
    }
    else if (options['emulator']) {
        opts.push('--virtual');
    }
    else if (options['device']) {
        opts.push('--device');
    }
    if (options['connect']) {
        opts.push('--connect');
    }
    for (const port of forwardedPorts) {
        opts.push('--forward', `${port}:${port}`);
    }
    if (options['json']) {
        opts.push('--json');
    }
    if (options['verbose']) {
        opts.push('--verbose');
    }
    return opts;
}
exports.createNativeRunArgs = createNativeRunArgs;
function createNativeRunListArgs(inputs, options) {
    const args = [];
    if (inputs[0]) {
        args.push(inputs[0]);
    }
    args.push('--list');
    if (options['json']) {
        args.push('--json');
    }
    if (options['device']) {
        args.push('--device');
    }
    if (options['emulator']) {
        args.push('--virtual');
    }
    if (options['json']) {
        args.push('--json');
    }
    return args;
}
exports.createNativeRunListArgs = createNativeRunListArgs;
async function runNativeRun({ config, log, shell }, args, options = {}) {
    const connect = args.includes('--connect');
    const stream = logger_1.createPrefixedWriteStream(log, color_1.weak(`[native-run]`));
    try {
        await shell.run('native-run', args, { showCommand: !args.includes('--json'), fatalOnNotFound: false, stream, ...options });
    }
    catch (e) {
        if (e instanceof utils_subprocess_1.SubprocessError && e.code === utils_subprocess_1.ERROR_COMMAND_NOT_FOUND) {
            throw createNativeRunNotFoundError(config.get('npmClient'));
        }
        throw e;
    }
    // If we connect the `native-run` process to the running app, then we
    // should also connect the Ionic CLI with the running `native-run` process.
    // This will exit the Ionic CLI when `native-run` exits.
    if (connect) {
        utils_process_1.processExit(0);
    }
}
exports.runNativeRun = runNativeRun;
async function checkNativeRun({ config }) {
    const p = await findNativeRun();
    if (!p) {
        throw await createNativeRunNotFoundError(config.get('npmClient'));
    }
}
exports.checkNativeRun = checkNativeRun;
async function findNativeRun() {
    try {
        return await utils_subprocess_1.which('native-run');
    }
    catch (e) {
        if (e.code !== 'ENOENT') {
            throw e;
        }
    }
}
exports.findNativeRun = findNativeRun;
async function createNativeRunNotFoundError(npmClient) {
    const installArgs = await npm_1.pkgManagerArgs(npmClient, { command: 'install', pkg: 'native-run', global: true });
    return new errors_1.FatalException(`${color_1.input('native-run')} was not found on your PATH. Please install it globally:\n` +
        `${color_1.input(installArgs.join(' '))}\n`);
}
async function getNativeTargets({ log, shell }, platform) {
    try {
        const proc = await shell.createSubprocess('native-run', [platform, '--list', '--json']);
        const output = await proc.output();
        return JSON.parse(output);
    }
    catch (e) {
        if (e instanceof utils_subprocess_1.SubprocessError && e.code === utils_subprocess_1.ERROR_NON_ZERO_EXIT) {
            const output = e.output ? JSON.parse(e.output) : {};
            throw new errors_1.FatalException(`Error while getting native targets for ${color_1.input(platform)}: ${output.error || output.code}\n` +
                (platform === 'android' && output.code === 'ERR_UNSUITABLE_API_INSTALLATION' ?
                    (`\n${color_1.input('native-run')} needs a fully installed SDK Platform to run your app.\n` +
                        `- Run ${color_1.input('native-run android --sdk-info')} to see missing packages for each API level.\n` +
                        `- Install missing packages in Android Studio by opening the SDK manager.\n`) : '') +
                `\nThis error occurred while using ${color_1.input('native-run')}. You can try running this command with ${color_1.input('--no-native-run')}, which will revert to using Cordova.\n`);
        }
        log.warn(`Error while getting native targets for ${color_1.input(platform)}:\n${e.stack ? e.stack : e}`);
    }
    return { devices: [], virtualDevices: [] };
}
exports.getNativeTargets = getNativeTargets;
