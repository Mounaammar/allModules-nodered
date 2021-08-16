import { Command } from '@oclif/command';
export declare class Start extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        open: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        tunnel: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    static openBrowser(): void;
    static stopProcess(): Promise<void>;
    run(): Promise<void>;
}
