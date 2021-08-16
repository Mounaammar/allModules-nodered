import { Command, flags } from '@oclif/command';
export declare class UpdateWorkflowCommand extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        active: flags.IOptionFlag<string | undefined>;
        all: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        id: flags.IOptionFlag<string | undefined>;
    };
    run(): Promise<void>;
}
