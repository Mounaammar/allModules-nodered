"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runUpdateNotify = exports.runNotify = exports.runUpdateCheck = exports.getUpdateConfig = exports.writeUpdateConfig = exports.readUpdateConfig = void 0;
const utils_fs_1 = require("@ionic/utils-fs");
const utils_terminal_1 = require("@ionic/utils-terminal");
const path = require("path");
const semver = require("semver");
const color_1 = require("./color");
const helper_1 = require("./helper");
const npm_1 = require("./utils/npm");
const UPDATE_CONFIG_FILE = 'update.json';
const UPDATE_CHECK_INTERVAL = 60 * 60 * 24 * 1000; // 1 day
const UPDATE_NOTIFY_INTERVAL = 60 * 60 * 12 * 1000; // 12 hours
const PACKAGES = ['@ionic/cli', 'native-run', 'cordova-res'];
async function readUpdateConfig(dir) {
    return utils_fs_1.readJson(path.resolve(dir, UPDATE_CONFIG_FILE));
}
exports.readUpdateConfig = readUpdateConfig;
async function writeUpdateConfig(dir, config) {
    await utils_fs_1.writeJson(path.resolve(dir, UPDATE_CONFIG_FILE), config, { spaces: 2 });
}
exports.writeUpdateConfig = writeUpdateConfig;
async function getUpdateConfig({ config }) {
    const dir = path.dirname(config.p);
    try {
        return await readUpdateConfig(dir);
    }
    catch (e) {
        if (e.code !== 'ENOENT') {
            process.stderr.write(`${e.stack ? e.stack : e}\n`);
        }
        return { packages: [] };
    }
}
exports.getUpdateConfig = getUpdateConfig;
async function runUpdateCheck({ config }) {
    const dir = path.dirname(config.p);
    const pkgs = (await Promise.all(PACKAGES.map(pkg => npm_1.pkgFromRegistry(config.get('npmClient'), { pkg }))))
        .filter((pkg) => typeof pkg !== 'undefined');
    const updateConfig = await getUpdateConfig({ config });
    const newUpdateConfig = {
        ...updateConfig,
        lastUpdate: new Date().toISOString(),
        packages: pkgs.map(pkg => ({
            name: pkg.name,
            version: pkg.version,
        })),
    };
    await writeUpdateConfig(dir, newUpdateConfig);
}
exports.runUpdateCheck = runUpdateCheck;
async function runNotify(env, pkg, latestVersion) {
    const dir = path.dirname(env.config.p);
    const args = await npm_1.pkgManagerArgs(env.config.get('npmClient'), { command: 'install', pkg: pkg.name, global: true });
    const lines = [
        `Ionic CLI update available: ${color_1.weak(pkg.version)} ??? ${color_1.success(latestVersion)}`,
        `Run ${color_1.input(args.join(' '))} to update`,
    ];
    // TODO: Pull this into utils/format
    const padding = 3;
    const longestLineLength = Math.max(...lines.map(line => utils_terminal_1.stringWidth(line)));
    const horizontalRule = `  ${'???'.repeat(longestLineLength + padding * 2)}`;
    const output = (`\n${horizontalRule}\n\n` +
        `${lines.map(line => `  ${' '.repeat((longestLineLength - utils_terminal_1.stringWidth(line)) / 2 + padding)}${line}`).join('\n')}\n\n` +
        `${horizontalRule}\n\n`);
    process.stderr.write(output);
    const updateConfig = await getUpdateConfig(env);
    updateConfig.lastNotify = new Date().toISOString();
    await writeUpdateConfig(dir, updateConfig);
}
exports.runNotify = runNotify;
async function runUpdateNotify(env, pkg) {
    const { name, version } = pkg;
    const { lastUpdate, lastNotify, packages } = await getUpdateConfig(env);
    const latestPkg = packages.find(pkg => pkg.name === name);
    const latestVersion = latestPkg ? latestPkg.version : undefined;
    if ((!lastNotify || new Date(lastNotify).getTime() + UPDATE_NOTIFY_INTERVAL < new Date().getTime()) && latestVersion && semver.gt(latestVersion, version)) {
        await runNotify(env, pkg, latestVersion);
    }
    if (!lastUpdate || new Date(lastUpdate).getTime() + UPDATE_CHECK_INTERVAL < new Date().getTime()) {
        await helper_1.sendMessage(env, { type: 'update-check' });
    }
}
exports.runUpdateNotify = runUpdateNotify;
