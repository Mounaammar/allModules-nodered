/// <reference types="node" />
import { PromptModule } from '@ionic/cli-framework-prompts';
import { BaseBuildOptions, BuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, IConfig, ILogger, IProject, IShell, NpmClient, Runner } from '../definitions';
export declare const BUILD_SCRIPT = "ionic:build";
export declare const COMMON_BUILD_COMMAND_OPTIONS: readonly CommandMetadataOption[];
export interface BuildRunnerDeps {
    readonly config: IConfig;
    readonly log: ILogger;
    readonly project: IProject;
    readonly prompt: PromptModule;
    readonly shell: IShell;
}
export declare abstract class BuildRunner<T extends BuildOptions<any>> implements Runner<T, void> {
    protected abstract readonly e: BuildRunnerDeps;
    abstract getCommandMetadata(): Promise<Partial<CommandMetadata>>;
    abstract createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): T;
    abstract buildProject(options: T): Promise<void>;
    getPkgManagerBuildCLI(): PkgManagerBuildCLI;
    createBaseOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): BaseBuildOptions;
    determineEngineFromCommandLine(options: CommandLineOptions): string;
    beforeBuild(options: T): Promise<void>;
    run(options: T): Promise<void>;
    afterBuild(options: T): Promise<void>;
}
export declare abstract class BuildCLI<T extends object> {
    protected readonly e: BuildRunnerDeps;
    /**
     * The pretty name of this Build CLI.
     */
    abstract readonly name: string;
    /**
     * The npm package of this Build CLI.
     */
    abstract readonly pkg: string;
    /**
     * The bin program to use for this Build CLI.
     */
    abstract readonly program: string;
    /**
     * If specified, `package.json` is inspected for this script to use instead
     * of `program`.
     */
    abstract readonly script?: string;
    /**
     * If true, the Build CLI will not prompt to be installed.
     */
    readonly global: boolean;
    private _resolvedProgram?;
    constructor(e: BuildRunnerDeps);
    get resolvedProgram(): string;
    /**
     * Build the arguments for starting this Build CLI. Called by `this.run()`.
     */
    protected abstract buildArgs(options: T): Promise<string[]>;
    /**
     * Build the environment variables for this Build CLI. Called by `this.run()`.
     */
    protected buildEnvVars(options: T): Promise<NodeJS.ProcessEnv>;
    resolveScript(): Promise<string | undefined>;
    build(options: T): Promise<void>;
    protected runWrapper(options: T): Promise<void>;
    protected run(options: T): Promise<void>;
    protected resolveProgram(): Promise<string>;
    protected promptToInstall(): Promise<boolean>;
}
declare abstract class PkgManagerBuildCLI extends BuildCLI<BaseBuildOptions> {
    readonly abstract program: NpmClient;
    readonly global = true;
    readonly script = "ionic:build";
    protected resolveProgram(): Promise<string>;
    protected buildArgs(options: BaseBuildOptions): Promise<string[]>;
}
export declare class NpmBuildCLI extends PkgManagerBuildCLI {
    readonly name = "npm CLI";
    readonly pkg = "npm";
    readonly program = "npm";
}
export declare class PnpmBuildCLI extends PkgManagerBuildCLI {
    readonly name = "pnpm CLI";
    readonly pkg = "pnpm";
    readonly program = "pnpm";
}
export declare class YarnBuildCLI extends PkgManagerBuildCLI {
    readonly name = "Yarn";
    readonly pkg = "yarn";
    readonly program = "yarn";
}
export {};
