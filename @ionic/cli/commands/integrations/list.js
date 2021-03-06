"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsListCommand = void 0;
const utils_terminal_1 = require("@ionic/utils-terminal");
const chalk = require("chalk");
const color_1 = require("../../lib/color");
const command_1 = require("../../lib/command");
const errors_1 = require("../../lib/errors");
const integrations_1 = require("../../lib/integrations");
class IntegrationsListCommand extends command_1.Command {
    async getMetadata() {
        return {
            name: 'list',
            type: 'project',
            summary: 'List available and active integrations in your app',
            description: `
This command will print the status of integrations in Ionic projects. Integrations can be ${color_1.strong('enabled')} (added and enabled), ${color_1.strong('disabled')} (added but disabled), and ${color_1.strong('not added')} (never added to the project).

- To enable or add integrations, see ${color_1.input('ionic integrations enable --help')}
- To disable integrations, see ${color_1.input('ionic integrations disable --help')}
      `,
        };
    }
    async run(inputs, options) {
        const { project } = this;
        if (!project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input('ionic integrations list')} outside a project directory.`);
        }
        const integrations = await Promise.all(integrations_1.INTEGRATION_NAMES.map(async (name) => project.createIntegration(name)));
        const status = (name) => {
            const c = project.config.get('integrations')[name];
            if (c) {
                if (c.enabled === false) {
                    return chalk.dim.red('disabled');
                }
                return chalk.green('enabled');
            }
            return chalk.dim('not added');
        };
        this.env.log.rawmsg(utils_terminal_1.columnar(integrations.map(i => [color_1.input(i.name), i.summary, status(i.name)]), { headers: ['name', 'summary', 'status'] }));
    }
}
exports.IntegrationsListCommand = IntegrationsListCommand;
