"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutCommand = void 0;
const color_1 = require("../lib/color");
const command_1 = require("../lib/command");
class LogoutCommand extends command_1.Command {
    async getMetadata() {
        return {
            name: 'logout',
            type: 'global',
            summary: 'Log out of Ionic',
            description: `
Remove the Ionic user token from the CLI config.

Log in again with ${color_1.input('ionic login')}.

If you need to create an Ionic account, use ${color_1.input('ionic signup')}.
      `,
        };
    }
    async run(inputs, options) {
        if (!this.env.session.isLoggedIn()) {
            this.env.log.msg('You are already logged out.');
            return;
        }
        await this.env.session.logout();
        this.env.log.ok('You are logged out.');
    }
}
exports.LogoutCommand = LogoutCommand;
