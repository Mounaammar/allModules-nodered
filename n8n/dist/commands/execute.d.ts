import { Command, flags } from '@oclif/command';
export declare class Execute extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        file: flags.IOptionFlag<string | undefined>;
        id: flags.IOptionFlag<string | undefined>;
        rawOutput: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
