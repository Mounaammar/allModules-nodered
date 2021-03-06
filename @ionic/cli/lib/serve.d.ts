/// <reference types="node" />
import { PromptModule } from '@ionic/cli-framework-prompts';
import { NetworkInterface } from '@ionic/utils-network';
import { EventEmitter } from 'events';
import * as stream from 'stream';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, IConfig, ILogger, IProject, IShell, IonicEnvironmentFlags, LabServeDetails, NpmClient, Runner, ServeDetails, ServeOptions } from '../definitions';
export declare const DEFAULT_DEV_LOGGER_PORT = 53703;
export declare const DEFAULT_LIVERELOAD_PORT = 35729;
export declare const DEFAULT_SERVER_PORT = 8100;
export declare const DEFAULT_LAB_PORT = 8200;
export declare const DEFAULT_DEVAPP_COMM_PORT = 53233;
export declare const DEFAULT_ADDRESS = "localhost";
export declare const BIND_ALL_ADDRESS = "0.0.0.0";
export declare const LOCAL_ADDRESSES: string[];
export declare const BROWSERS: string[];
export declare const SERVE_SCRIPT = "ionic:serve";
export declare const COMMON_SERVE_COMMAND_OPTIONS: readonly CommandMetadataOption[];
export interface ServeRunnerDeps {
    readonly config: IConfig;
    readonly flags: IonicEnvironmentFlags;
    readonly log: ILogger;
    readonly project: IProject;
    readonly prompt: PromptModule;
    readonly shell: IShell;
}
export declare abstract class ServeRunner<T extends ServeOptions> implements Runner<T, ServeDetails> {
    protected devAppConnectionMade: boolean;
    protected abstract readonly e: ServeRunnerDeps;
    abstract getCommandMetadata(): Promise<Partial<CommandMetadata>>;
    abstract serveProject(options: T): Promise<ServeDetails>;
    abstract modifyOpenUrl(url: string, options: T): string;
    getPkgManagerServeCLI(): PkgManagerServeCLI;
    createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): ServeOptions;
    determineEngineFromCommandLine(options: CommandLineOptions): string;
    beforeServe(options: T): Promise<void>;
    run(options: T): Promise<ServeDetails>;
    afterServe(options: T, details: ServeDetails): Promise<void>;
    scheduleAfterServe(options: T, details: ServeDetails): void;
    getUsedPorts(options: T, details: ServeDetails): number[];
    runLab(options: T, serveDetails: ServeDetails): Promise<LabServeDetails>;
    selectExternalIP(options: T): Promise<[string, NetworkInterface[]]>;
}
export interface ServeCLIOptions {
    readonly host: string;
    readonly port: number;
}
export interface ServeCLI<T extends ServeCLIOptions> {
    emit(event: 'compile', chunks: number): boolean;
    emit(event: 'ready'): boolean;
    on(event: 'compile', handler: (chunks: number) => void): this;
    on(event: 'ready', handler: () => void): this;
    once(event: 'compile', handler: (chunks: number) => void): this;
    once(event: 'ready', handler: () => void): this;
}
export declare abstract class ServeCLI<T extends ServeCLIOptions> extends EventEmitter {
    protected readonly e: ServeRunnerDeps;
    /**
     * The pretty name of this Serve CLI.
     */
    abstract readonly name: string;
    /**
     * The npm package of this Serve CLI.
     */
    abstract readonly pkg: string;
    /**
     * The bin program to use for this Serve CLI.
     */
    abstract readonly program: string;
    /**
     * The prefix to use for log statements.
     */
    abstract readonly prefix: string;
    /**
     * If specified, `package.json` is inspected for this script to use instead
     * of `program`.
     */
    abstract readonly script?: string;
    /**
     * If true, the Serve CLI will not prompt to be installed.
     */
    readonly global: boolean;
    private _resolvedProgram?;
    constructor(e: ServeRunnerDeps);
    get resolvedProgram(): string;
    /**
     * Build the arguments for starting this Serve CLI. Called by `this.start()`.
     */
    protected abstract buildArgs(options: T): Promise<string[]>;
    /**
     * Build the environment variables to be passed to the Serve CLI. Called by `this.start()`;
     */
    protected buildEnvVars(options: T): Promise<NodeJS.ProcessEnv>;
    /**
     * Called whenever a line of stdout is received.
     *
     * If `false` is returned, the line is not emitted to the log.
     *
     * By default, the CLI is considered ready whenever stdout is emitted. This
     * method should be overridden to more accurately portray readiness.
     *
     * @param line A line of stdout.
     */
    protected stdoutFilter(line: string): boolean;
    /**
     * Called whenever a line of stderr is received.
     *
     * If `false` is returned, the line is not emitted to the log.
     */
    protected stderrFilter(line: string): boolean;
    resolveScript(): Promise<string | undefined>;
    serve(options: T): Promise<void>;
    protected spawnWrapper(options: T): Promise<void>;
    protected spawn(options: T): Promise<void>;
    protected createLoggerStream(): NodeJS.WritableStream;
    protected resolveProgram(): Promise<string>;
    protected createStreamFilter(filter: (line: string) => boolean): stream.Transform;
    protected promptToInstall(): Promise<boolean>;
}
declare abstract class PkgManagerServeCLI extends ServeCLI<ServeOptions> {
    readonly abstract program: NpmClient;
    readonly global = true;
    readonly script = "ionic:serve";
    protected resolveProgram(): Promise<string>;
    protected buildArgs(options: ServeOptions): Promise<string[]>;
}
export declare class NpmServeCLI extends PkgManagerServeCLI {
    readonly name = "npm CLI";
    readonly pkg = "npm";
    readonly program = "npm";
    readonly prefix = "npm";
}
export declare class PnpmServeCLI extends PkgManagerServeCLI {
    readonly name = "pnpm CLI";
    readonly pkg = "pnpm";
    readonly program = "pnpm";
    readonly prefix = "pnpm";
}
export declare class YarnServeCLI extends PkgManagerServeCLI {
    readonly name = "Yarn";
    readonly pkg = "yarn";
    readonly program = "yarn";
    readonly prefix = "yarn";
}
export {};
