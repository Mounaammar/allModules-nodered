import { Command, flags } from '@oclif/command';
export declare class ListWorkflowCommand extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        active: flags.IOptionFlag<string | undefined>;
        onlyId: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
