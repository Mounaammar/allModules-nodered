import { Command } from '@oclif/command';
export declare class Webhook extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    static stopProcess(): Promise<void>;
    run(): Promise<void>;
}
