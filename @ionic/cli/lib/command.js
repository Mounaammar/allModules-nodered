"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const cli_framework_output_1 = require("@ionic/cli-framework-output");
const utils_terminal_1 = require("@ionic/utils-terminal");
const guards_1 = require("../guards");
const color_1 = require("./color");
const logger_1 = require("./utils/logger");
class Command extends cli_framework_1.BaseCommand {
    constructor(namespace) {
        super(namespace);
        this.namespace = namespace;
        this.taskChains = [];
    }
    get env() {
        return this.namespace.root.env;
    }
    get project() {
        return this.namespace.root.project;
    }
    createTaskChain() {
        let output;
        const formatter = logger_1.createFormatter();
        if (this.env.flags.interactive) {
            output = new cli_framework_output_1.TTYOutputStrategy({ stream: process.stdout, colors: cli_framework_1.DEFAULT_COLORS });
            this.env.log.handlers = new Set([new cli_framework_output_1.StreamHandler({ stream: output.stream, formatter })]);
        }
        else {
            this.env.log.handlers = logger_1.createDefaultLoggerHandlers();
            output = new cli_framework_output_1.StreamOutputStrategy({ stream: this.env.log.createWriteStream(cli_framework_output_1.LOGGER_LEVELS.INFO, false), colors: cli_framework_1.DEFAULT_COLORS });
        }
        const chain = output.createTaskChain();
        this.taskChains.push(chain);
        chain.on('end', () => {
            this.env.log.handlers = logger_1.createDefaultLoggerHandlers();
        });
        return chain;
    }
    async execute(inputs, options, runinfo) {
        if (guards_1.isCommandPreRun(this)) {
            await this.preRun(inputs, options, runinfo);
        }
        try {
            await this.validate(inputs);
        }
        catch (e) {
            if (!this.env.flags.interactive) {
                this.env.log.warn(`Command ran non-interactively due to ${color_1.input('--no-interactive')} flag, CI being detected, non-TTY, or a config setting.`);
            }
            throw e;
        }
        const runPromise = this.run(inputs, options, runinfo);
        const telemetryPromise = (async () => {
            if (this.env.config.get('telemetry') !== false && !utils_terminal_1.TERMINAL_INFO.ci && utils_terminal_1.TERMINAL_INFO.tty) {
                const { Telemetry } = await Promise.resolve().then(() => require('./telemetry'));
                let cmdInputs = [];
                const metadata = await this.getMetadata();
                if (metadata.name === 'login' || metadata.name === 'logout') {
                    // This is a hack to wait until the selected commands complete before
                    // sending telemetry data. These commands update `this.env` in some
                    // way, which is used in the `Telemetry` instance.
                    await runPromise;
                }
                else if (metadata.name === 'completion') {
                    // Ignore telemetry for these commands.
                    return;
                }
                else if (metadata.name === 'help') {
                    cmdInputs = inputs;
                }
                else {
                    cmdInputs = await this.getCleanInputsForTelemetry(inputs, options);
                }
                const cmd = this;
                const path = await cli_framework_1.generateCommandPath(cmd);
                const telemetry = new Telemetry({ client: this.env.client, config: this.env.config, getInfo: this.env.getInfo, ctx: this.env.ctx, project: this.project, session: this.env.session });
                await telemetry.sendCommand(path.map(([p]) => p).join(' '), cmdInputs);
            }
        })();
        await Promise.all([runPromise, telemetryPromise]);
    }
    async getCleanInputsForTelemetry(inputs, options) {
        const initialOptions = { _: [] };
        const metadata = await this.getMetadata();
        const filteredInputs = inputs.map((input, i) => metadata.inputs && (metadata.inputs[i] && metadata.inputs[i].private) ? '*****' : input);
        const filteredOptions = Object.keys(options)
            .filter(optionName => {
            if (optionName === '_') {
                return false;
            }
            const metadataOption = metadata.options && metadata.options.find(o => {
                return o.name === optionName || (typeof o.aliases !== 'undefined' && o.aliases.includes(optionName));
            });
            if (metadataOption && metadataOption.aliases && metadataOption.aliases.includes(optionName)) {
                return false; // exclude aliases
            }
            if (!metadataOption) {
                return true; // include unknown options
            }
            if (metadataOption.private) {
                return false; // exclude private options
            }
            if (typeof metadataOption.default !== 'undefined' && metadataOption.default === options[optionName]) {
                return false; // exclude options that match their default value (means it wasn't supplied by user)
            }
            return true;
        })
            .reduce((allOptions, optionName) => {
            allOptions[optionName] = options[optionName];
            return allOptions;
        }, initialOptions);
        const optionInputs = cli_framework_1.unparseArgs(filteredOptions, { useDoubleQuotes: true });
        return filteredInputs.concat(optionInputs);
    }
}
exports.Command = Command;
