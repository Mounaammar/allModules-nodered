import * as PCancelable from 'p-cancelable';
import { Command } from '@oclif/command';
import { INodeTypes, IRun } from 'n8n-workflow';
import { IBullJobResponse } from '../src';
import * as Bull from 'bull';
export declare class Worker extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        concurrency: import("@oclif/parser/lib/flags").IOptionFlag<number>;
    };
    static runningJobs: {
        [key: string]: PCancelable<IRun>;
    };
    static jobQueue: Bull.Queue;
    static processExistCode: number;
    static stopProcess(): Promise<void>;
    runJob(job: Bull.Job, nodeTypes: INodeTypes): Promise<IBullJobResponse>;
    run(): Promise<void>;
}
