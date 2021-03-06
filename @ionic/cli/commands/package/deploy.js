"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const cli_framework_output_1 = require("@ionic/cli-framework-output");
const utils_process_1 = require("@ionic/utils-process");
const utils_terminal_1 = require("@ionic/utils-terminal");
const chalk = require("chalk");
const guards_1 = require("../../guards");
const color_1 = require("../../lib/color");
const command_1 = require("../../lib/command");
const errors_1 = require("../../lib/errors");
class DeployCommand extends command_1.Command {
    async getMetadata() {
        const dashUrl = this.env.config.getDashUrl();
        return {
            name: 'deploy',
            type: 'project',
            groups: ["paid" /* PAID */],
            summary: 'Deploys a binary to a destination, such as an app store using Appflow',
            description: `
This command deploys a binary to a destination using Ionic Appflow. While running, the remote log is printed to the terminal.

The command takes two parameters: the numeric ID of the package build that previously created the binary and the name of the destination where the binary is going to be deployed.
Both can be retrieved from the Dashboard[^dashboard].
      `,
            footnotes: [
                {
                    id: 'dashboard',
                    url: dashUrl,
                },
            ],
            exampleCommands: ['123456789 "My app store destination"'],
            inputs: [
                {
                    name: 'build-id',
                    summary: `The build id of the desired successful package build`,
                    validators: [cli_framework_1.validators.required, cli_framework_1.validators.numeric],
                },
                {
                    name: 'destination',
                    summary: 'The destination to deploy the build artifact to the app store',
                    validators: [cli_framework_1.validators.required],
                },
            ],
        };
    }
    async preRun(inputs, options) {
        if (!inputs[0]) {
            const buildIdInputInput = await this.env.prompt({
                type: 'input',
                name: 'build-id',
                message: `The build ID on Appflow:`,
                validate: v => cli_framework_1.combine(cli_framework_1.validators.required, cli_framework_1.validators.numeric)(v),
            });
            inputs[0] = buildIdInputInput;
        }
        if (!inputs[1]) {
            const destinationInputInput = await this.env.prompt({
                type: 'input',
                name: 'destination',
                message: `The destination to deploy the build artifact to the app store:`,
                validate: v => cli_framework_1.combine(cli_framework_1.validators.required)(v),
            });
            inputs[1] = destinationInputInput;
        }
    }
    async run(inputs, options) {
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input('ionic package build')} outside a project directory.`);
        }
        const token = await this.env.session.getUserToken();
        const appflowId = await this.project.requireAppflowId();
        const [buildId, destination] = inputs;
        let build = await this.createDeploymentBuild(appflowId, token, buildId, destination);
        const distBuildID = build.job_id;
        const details = utils_terminal_1.columnar([
            ['App ID', color_1.strong(appflowId)],
            ['Deployment ID', color_1.strong(build.binary_deployment.id.toString())],
            ['Package Build ID', color_1.strong(buildId.toString())],
            ['Destination', color_1.strong(build.distribution_credential_name)],
        ], { vsep: ':' });
        this.env.log.ok(`Deployment initiated\n` + details + '\n\n');
        build = await this.tailBuildLog(appflowId, distBuildID, token);
        if (build.state !== 'success') {
            throw new Error('Build failed');
        }
    }
    async createDeploymentBuild(appflowId, token, buildId, destination) {
        const { req } = await this.env.client.make('POST', `/apps/${appflowId}/distributions/verbose_post`);
        req.set('Authorization', `Bearer ${token}`).send({
            package_build_id: buildId,
            distribution_credential_name: destination,
        });
        try {
            const res = await this.env.client.do(req);
            return res.data;
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e)) {
                if (e.response.status === 401) {
                    this.env.log.error('Try logging out and back in again.');
                }
                const apiErrorMessage = e.response.body.error && e.response.body.error.message
                    ? e.response.body.error.message
                    : 'Api Error';
                throw new errors_1.FatalException(`Unable to create deployment build: ` + apiErrorMessage);
            }
            else {
                throw e;
            }
        }
    }
    async tailBuildLog(appflowId, buildId, token) {
        let build;
        let start = 0;
        const ws = this.env.log.createWriteStream(cli_framework_output_1.LOGGER_LEVELS.INFO, false);
        let isCreatedMessage = false;
        while (!(build && (build.state === 'success' || build.state === 'failed'))) {
            await utils_process_1.sleep(5000);
            build = await this.getGenericBuild(appflowId, buildId, token);
            if (build && build.state === 'created' && !isCreatedMessage) {
                ws.write(chalk.yellow('Concurrency limit reached: build will start as soon as other builds finish.'));
                isCreatedMessage = true;
            }
            const trace = build.distribution_trace;
            if (trace && trace.length > start) {
                ws.write(trace.substring(start));
                start = trace.length;
            }
        }
        ws.end();
        return build;
    }
    async getGenericBuild(appflowId, buildId, token) {
        const { req } = await this.env.client.make('GET', `/apps/${appflowId}/builds/${buildId}`);
        req.set('Authorization', `Bearer ${token}`).send();
        try {
            const res = await this.env.client.do(req);
            return res.data;
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e)) {
                if (e.response.status === 401) {
                    this.env.log.error('Try logging out and back in again.');
                }
                const apiErrorMessage = e.response.body.error && e.response.body.error.message
                    ? e.response.body.error.message
                    : 'Api Error';
                throw new errors_1.FatalException(`Unable to get build ${buildId}: ` + apiErrorMessage);
            }
            else {
                throw e;
            }
        }
    }
}
exports.DeployCommand = DeployCommand;
