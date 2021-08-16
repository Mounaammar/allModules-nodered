import { Command, flags } from '@oclif/command';
import { IWorkflowDb } from '../src';
export declare class ExecuteBatch extends Command {
    static description: string;
    static cancelled: boolean;
    static workflowExecutionsProgress: IWorkflowExecutionProgress[][];
    static shallow: boolean;
    static compare: string;
    static snapshot: string;
    static concurrency: number;
    static debug: boolean;
    static executionTimeout: number;
    static examples: string[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        debug: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        ids: flags.IOptionFlag<string | undefined>;
        concurrency: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        output: flags.IOptionFlag<string | undefined>;
        snapshot: flags.IOptionFlag<string | undefined>;
        compare: flags.IOptionFlag<string | undefined>;
        shallow: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        skipList: flags.IOptionFlag<string | undefined>;
        retries: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        shortOutput: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    static stopProcess(skipExit?: boolean | number): Promise<void>;
    formatJsonOutput(data: object): string;
    shouldBeConsideredAsWarning(errorMessage: string): boolean;
    run(): Promise<void>;
    mergeResults(results: IResult, retryResults: IResult): void;
    runTests(allWorkflows: IWorkflowDb[]): Promise<IResult>;
    updateStatus(): void;
    initializeLogs(): void;
    startThread(workflowData: IWorkflowDb): Promise<IExecutionResult>;
}
