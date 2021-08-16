import { Command, flags } from '@oclif/command';
export declare class ImportCredentialsCommand extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        input: flags.IOptionFlag<string | undefined>;
        separate: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
