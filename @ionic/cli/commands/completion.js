"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const utils_terminal_1 = require("@ionic/utils-terminal");
const path = require("path");
const color_1 = require("../lib/color");
const command_1 = require("../lib/command");
const errors_1 = require("../lib/errors");
class CompletionCommand extends command_1.Command {
    async getMetadata() {
        return {
            name: 'completion',
            type: 'global',
            summary: 'Enables tab-completion for Ionic CLI commands.',
            description: `
This command is experimental and only works for Z shell (zsh) and non-Windows platforms.

To enable completions for the Ionic CLI, you can add the completion code that this command prints to your ${color_1.strong('~/.zshrc')} (or any other file loaded with your shell). See the examples.
      `,
            groups: ["experimental" /* EXPERIMENTAL */],
            exampleCommands: [
                '',
                '>> ~/.zshrc',
            ],
        };
    }
    async run(inputs, options) {
        if (utils_terminal_1.TERMINAL_INFO.windows) {
            throw new errors_1.FatalException('Completion is not supported on Windows shells.');
        }
        if (path.basename(utils_terminal_1.TERMINAL_INFO.shell) !== 'zsh') {
            throw new errors_1.FatalException('Completion is currently only available for Z Shell (zsh).');
        }
        const words = options['--'];
        if (!words || words.length === 0) {
            const namespace = this.namespace.root;
            const formatter = new cli_framework_1.ZshCompletionFormatter({ namespace });
            process.stdout.write(await formatter.format());
            return;
        }
        const ns = this.namespace.root;
        const outputWords = await cli_framework_1.getCompletionWords(ns, words.slice(1));
        process.stdout.write(outputWords.join(' '));
    }
}
exports.CompletionCommand = CompletionCommand;
