import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-framework';
import { CommandMetadata } from '../../definitions';
import { Command } from '../../lib/command';
interface Artifact {
    name: string;
    url: string;
    artifact_type: string;
}
export interface PackageBuild {
    job_id: number;
    id: string;
    caller_id: number;
    platform: string;
    build_type: string;
    created: string;
    finished: string;
    state: string;
    commit: any;
    stack: any;
    profile_tag: string;
    automation_id: number;
    environment_id: number;
    native_config_id: number;
    automation_name: string;
    environment_name: string;
    native_config_name: string;
    distribution_credential_name: string;
    job: any;
    distribution_trace: string;
    artifacts: Artifact[];
}
interface DownloadUrl {
    url: string | null;
}
export declare class BuildCommand extends Command {
    getMetadata(): Promise<CommandMetadata>;
    preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;
    run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;
    sanitizeString(value: string | string[] | boolean | null | undefined): Promise<string>;
    createPackageBuild(appflowId: string, token: string, platform: string, buildType: string, options: CommandLineOptions): Promise<PackageBuild>;
    getPackageBuild(appflowId: string, buildId: number, token: string): Promise<PackageBuild>;
    getDownloadUrl(appflowId: string, buildId: number, artifactType: string, token: string): Promise<DownloadUrl>;
    tailBuildLog(appflowId: string, buildId: number, token: string): Promise<PackageBuild>;
    downloadBuild(url: string, filename: string): Promise<string>;
    downloadArtifact(appflowId: string, buildId: number, artifactType: string, token: string, options: CommandLineOptions): Promise<void>;
}
export {};
