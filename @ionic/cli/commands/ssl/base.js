"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSLBaseCommand = void 0;
const utils_subprocess_1 = require("@ionic/utils-subprocess");
const color_1 = require("../../lib/color");
const command_1 = require("../../lib/command");
const errors_1 = require("../../lib/errors");
class SSLBaseCommand extends command_1.Command {
    async checkForOpenSSL() {
        try {
            await this.env.shell.run('openssl', ['version'], { stdio: 'ignore', showCommand: false, fatalOnNotFound: false });
        }
        catch (e) {
            if (!(e instanceof utils_subprocess_1.SubprocessError && e.code === utils_subprocess_1.ERROR_COMMAND_NOT_FOUND)) {
                throw e;
            }
            this.env.log.warn('OpenSSL not found on your computer.'); // TODO: more helpful message
            throw new errors_1.FatalException(`Command not found: ${color_1.input('openssl')}`);
        }
    }
}
exports.SSLBaseCommand = SSLBaseCommand;
