"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = void 0;
const config = require("../config");
const winston = require("winston");
const callsites = require("callsites");
const path_1 = require("path");
class Logger {
    constructor() {
        const level = config.get('logs.level');
        const output = config.get('logs.output').split(',').map(output => output.trim());
        this.logger = winston.createLogger({
            level,
        });
        if (output.includes('console')) {
            let format;
            if (['debug', 'verbose'].includes(level)) {
                format = winston.format.combine(winston.format.metadata(), winston.format.timestamp(), winston.format.colorize({ all: true }), winston.format.printf(({ level, message, timestamp, metadata }) => {
                    return `${timestamp} | ${level.padEnd(18)} | ${message}` + (Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '');
                }));
            }
            else {
                format = winston.format.printf(({ message }) => message);
            }
            this.logger.add(new winston.transports.Console({
                format,
            }));
        }
        if (output.includes('file')) {
            const fileLogFormat = winston.format.combine(winston.format.timestamp(), winston.format.metadata(), winston.format.json());
            this.logger.add(new winston.transports.File({
                filename: config.get('logs.file.location'),
                format: fileLogFormat,
                maxsize: config.get('logs.file.fileSizeMax') * 1048576,
                maxFiles: config.get('logs.file.fileCountMax'),
            }));
        }
    }
    log(type, message, meta = {}) {
        const callsite = callsites();
        const logDetails = {};
        if (callsite[2] !== undefined) {
            logDetails.file = path_1.basename(callsite[2].getFileName() || '');
            const functionName = callsite[2].getFunctionName();
            if (functionName) {
                logDetails.function = functionName;
            }
        }
        this.logger.log(type, message, Object.assign(Object.assign({}, meta), logDetails));
    }
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }
    info(message, meta = {}) {
        this.log('info', message, meta);
    }
    error(message, meta = {}) {
        this.log('error', message, meta);
    }
    verbose(message, meta = {}) {
        this.log('verbose', message, meta);
    }
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }
}
let activeLoggerInstance;
function getLogger() {
    if (activeLoggerInstance === undefined) {
        activeLoggerInstance = new Logger();
    }
    return activeLoggerInstance;
}
exports.getLogger = getLogger;
//# sourceMappingURL=Logger.js.map