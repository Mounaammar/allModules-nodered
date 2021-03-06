"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrefixedWriteStream = exports.createDefaultLoggerHandlers = exports.createFormatter = exports.Logger = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const cli_framework_output_1 = require("@ionic/cli-framework-output");
const chalk = require("chalk");
const color_1 = require("../color");
class Logger extends cli_framework_output_1.Logger {
    ok(msg) {
        this.log({ ...this.createRecord(`${color_1.weak('[')}${chalk.bold.green('OK')}${color_1.weak(']')} ${msg}`), format: false });
    }
    rawmsg(msg) {
        this.log({ ...this.createRecord(msg), format: false });
    }
}
exports.Logger = Logger;
function createFormatter(options = {}) {
    const prefix = process.argv.includes('--log-timestamps') ? () => `${color_1.weak('[' + new Date().toISOString() + ']')}` : '';
    return cli_framework_output_1.createTaggedFormatter({ colors: cli_framework_1.DEFAULT_COLORS, prefix, titleize: true, wrap: true, ...options });
}
exports.createFormatter = createFormatter;
function createDefaultLoggerHandlers(formatter = createFormatter()) {
    return new Set([...cli_framework_output_1.DEFAULT_LOGGER_HANDLERS].map(handler => handler.clone({ formatter })));
}
exports.createDefaultLoggerHandlers = createDefaultLoggerHandlers;
function createPrefixedWriteStream(log, prefix, level = cli_framework_output_1.LOGGER_LEVELS.INFO) {
    const l = log.clone();
    l.handlers = createDefaultLoggerHandlers(cli_framework_output_1.createPrefixedFormatter(prefix));
    return l.createWriteStream(level);
}
exports.createPrefixedWriteStream = createPrefixedWriteStream;
