"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocsCommand = void 0;
const guards_1 = require("../guards");
const color_1 = require("../lib/color");
const command_1 = require("../lib/command");
const open_1 = require("../lib/open");
const serve_1 = require("../lib/serve");
const http_1 = require("../lib/utils/http");
class DocsCommand extends command_1.Command {
    async getMetadata() {
        return {
            name: 'docs',
            type: 'global',
            summary: 'Open the Ionic documentation website',
            options: [
                {
                    name: 'browser',
                    summary: `Specifies the browser to use (${serve_1.BROWSERS.map(b => color_1.input(b)).join(', ')})`,
                    aliases: ['w'],
                    groups: ["advanced" /* ADVANCED */],
                },
            ],
        };
    }
    async run(inputs, options) {
        const browser = options['browser'] ? String(options['browser']) : undefined;
        const homepage = 'https://ion.link/docs';
        const url = this.project ? await this.project.getDocsUrl() : homepage;
        try {
            const { req } = await http_1.createRequest('HEAD', url, this.env.config.getHTTPConfig());
            await req;
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e) && e.response.status === 404) {
                this.env.log.warn(`Docs not found for your specific version of Ionic. Directing you to docs homepage.`);
                await open_1.openUrl(homepage, { app: browser });
                return;
            }
            throw e;
        }
        await open_1.openUrl(url, { app: browser });
        this.env.log.ok('Launched Ionic docs in your browser!');
    }
}
exports.DocsCommand = DocsCommand;
