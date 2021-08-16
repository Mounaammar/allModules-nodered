import { Command, flags } from '@oclif/command';
export declare class ExportCredentialsCommand extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        all: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        backup: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        id: flags.IOptionFlag<string | undefined>;
        output: flags.IOptionFlag<string | undefined>;
        pretty: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        separate: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        decrypted: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
