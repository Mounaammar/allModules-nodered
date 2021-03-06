"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementsCommand = void 0;
const guards_1 = require("../../guards");
const color_1 = require("../../lib/color");
const errors_1 = require("../../lib/errors");
const utils_1 = require("../../lib/integrations/cordova/utils");
const base_1 = require("./base");
class RequirementsCommand extends base_1.CordovaCommand {
    async getMetadata() {
        return {
            name: 'requirements',
            type: 'project',
            summary: 'Checks and print out all the requirements for platforms',
            description: `
Like running ${color_1.input('cordova requirements')} directly, but provides friendly checks.
      `,
            inputs: [
                {
                    name: 'platform',
                    summary: `The platform for which you would like to gather requirements (${['android', 'ios'].map(v => color_1.input(v)).join(', ')})`,
                },
            ],
        };
    }
    async preRun(inputs, options, runinfo) {
        await this.preRunChecks(runinfo);
    }
    async run(inputs, options) {
        const [platform] = inputs;
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input('ionic cordova requirements')} outside a project directory.`);
        }
        await this.checkForPlatformInstallation(platform, {
            promptToInstall: true,
            promptToInstallRefusalMsg: (`Can't gather requirements for ${color_1.input(platform)} unless the platform is installed.\n` +
                `Did you mean just ${color_1.input('ionic cordova requirements')}?\n`),
        });
        const metadata = await this.getMetadata();
        try {
            await this.runCordova(utils_1.filterArgumentsForCordova(metadata, options), { showError: false, fatalOnError: false });
        }
        catch (e) {
            if (e.fatal || !guards_1.isExitCodeException(e)) {
                throw e;
            }
            throw new errors_1.FatalException();
        }
    }
}
exports.RequirementsCommand = RequirementsCommand;
