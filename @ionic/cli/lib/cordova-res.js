"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCordovaResNotFoundMessage = exports.createCordovaResNotFoundError = exports.findCordovaRes = exports.checkCordovaRes = exports.runCordovaRes = exports.createCordovaResArgs = exports.SUPPORTED_PLATFORMS = void 0;
const utils_subprocess_1 = require("@ionic/utils-subprocess");
const color_1 = require("./color");
const errors_1 = require("./errors");
const logger_1 = require("./utils/logger");
const npm_1 = require("./utils/npm");
exports.SUPPORTED_PLATFORMS = ['ios', 'android'];
function createCordovaResArgs({ platform }, options) {
    const args = [];
    if (platform) {
        args.push(platform);
    }
    if (options['icon']) {
        args.push('--type', 'icon');
    }
    else if (options['splash']) {
        args.push('--type', 'splash');
    }
    if (options['verbose']) {
        args.push('--verbose');
    }
    return args;
}
exports.createCordovaResArgs = createCordovaResArgs;
async function runCordovaRes({ config, log, shell }, args, options = {}) {
    const stream = logger_1.createPrefixedWriteStream(log, color_1.weak(`[cordova-res]`));
    try {
        await shell.run('cordova-res', args, { showCommand: true, fatalOnNotFound: false, stream, ...options });
    }
    catch (e) {
        if (e instanceof utils_subprocess_1.SubprocessError && e.code === utils_subprocess_1.ERROR_COMMAND_NOT_FOUND) {
            throw await createCordovaResNotFoundError(config.get('npmClient'));
        }
        throw e;
    }
}
exports.runCordovaRes = runCordovaRes;
async function checkCordovaRes({ config }) {
    const p = await findCordovaRes();
    if (!p) {
        throw await createCordovaResNotFoundError(config.get('npmClient'));
    }
}
exports.checkCordovaRes = checkCordovaRes;
async function findCordovaRes() {
    try {
        return await utils_subprocess_1.which('cordova-res');
    }
    catch (e) {
        if (e.code !== 'ENOENT') {
            throw e;
        }
    }
}
exports.findCordovaRes = findCordovaRes;
async function createCordovaResNotFoundError(npmClient) {
    return new errors_1.FatalException(await createCordovaResNotFoundMessage(npmClient));
}
exports.createCordovaResNotFoundError = createCordovaResNotFoundError;
async function createCordovaResNotFoundMessage(npmClient) {
    const installArgs = await npm_1.pkgManagerArgs(npmClient, { command: 'install', pkg: 'cordova-res', global: true });
    return (`${color_1.input('cordova-res')} was not found on your PATH. Please install it globally:\n\n` +
        `${color_1.input(installArgs.join(' '))}\n`);
}
exports.createCordovaResNotFoundMessage = createCordovaResNotFoundMessage;
