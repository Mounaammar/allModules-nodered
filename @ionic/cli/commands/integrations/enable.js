"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsEnableCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const path = require("path");
const guards_1 = require("../../guards");
const color_1 = require("../../lib/color");
const command_1 = require("../../lib/command");
const errors_1 = require("../../lib/errors");
const integrations_1 = require("../../lib/integrations");
class IntegrationsEnableCommand extends command_1.Command {
    async getMetadata() {
        return {
            name: 'enable',
            type: 'project',
            summary: 'Add & enable integrations to your app',
            description: `
Integrations, such as Cordova, can be enabled with this command. If the integration has never been added to the project, ${color_1.input('ionic integrations enable')} will download and add the integration.

Integrations can be re-added with the ${color_1.input('--add')} option.
      `,
            inputs: [
                {
                    name: 'name',
                    summary: `The integration to enable (e.g. ${integrations_1.INTEGRATION_NAMES.map(i => color_1.input(i)).join(', ')})`,
                    validators: [cli_framework_1.validators.required, cli_framework_1.contains(integrations_1.INTEGRATION_NAMES, {})],
                },
            ],
            options: [
                {
                    name: 'add',
                    summary: 'Download and add the integration even if enabled',
                    type: Boolean,
                },
                {
                    name: 'root',
                    summary: 'Specify an alternative destination to download into when adding',
                    spec: { value: 'path' },
                },
                {
                    name: 'quiet',
                    summary: 'Less verbose output, ignore integration errors',
                    type: Boolean,
                },
            ],
        };
    }
    async run(inputs, options) {
        const [name] = inputs;
        const { add, quiet } = options;
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input('ionic integrations enable')} outside a project directory.`);
        }
        const root = options['root']
            ? path.resolve(this.project.rootDirectory, String(options['root']))
            : this.project.rootDirectory;
        if (!guards_1.isIntegrationName(name)) {
            throw new errors_1.FatalException(`Don't know about ${color_1.input(name)} integration!`);
        }
        const integration = await this.project.createIntegration(name);
        try {
            if (!integration.isAdded() || add) {
                await integration.add({
                    root,
                    enableArgs: options['--'] ? options['--'] : undefined,
                    quiet: Boolean(quiet),
                });
                this.env.log.ok(`Integration ${color_1.input(integration.name)} added!`);
            }
            else {
                const wasEnabled = integration.config.get('enabled') !== false;
                // We still need to run this whenever this command is run to make sure
                // everything is good with the integration.
                await integration.enable();
                if (wasEnabled) {
                    this.env.log.info(`Integration ${color_1.input(integration.name)} already enabled.`);
                }
                else {
                    this.env.log.ok(`Integration ${color_1.input(integration.name)} enabled!`);
                }
            }
        }
        catch (e) {
            if (e instanceof cli_framework_1.BaseError) {
                if (quiet) {
                    this.env.log.error(e.message);
                }
                else {
                    throw new errors_1.FatalException(e.message);
                }
            }
            else {
                throw e;
            }
        }
    }
}
exports.IntegrationsEnableCommand = IntegrationsEnableCommand;
