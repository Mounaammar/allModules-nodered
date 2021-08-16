import * as Bull from 'bull';
import { IBullJobData } from './Interfaces';
export declare class Queue {
    private jobQueue;
    constructor();
    add(jobData: IBullJobData, jobOptions: object): Promise<Bull.Job>;
    getJob(jobId: Bull.JobId): Promise<Bull.Job | null>;
    getJobs(jobTypes: Bull.JobStatus[]): Promise<Bull.Job[]>;
    getBullObjectInstance(): Bull.Queue;
    stopJob(job: Bull.Job): Promise<boolean>;
}
export declare function getInstance(): Queue;
