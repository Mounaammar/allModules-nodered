"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstance = exports.Queue = void 0;
const Bull = require("bull");
const config = require("../config");
class Queue {
    constructor() {
        const prefix = config.get('queue.bull.prefix');
        const redisOptions = config.get('queue.bull.redis');
        this.jobQueue = new Bull('jobs', { prefix, redis: redisOptions, enableReadyCheck: false });
    }
    async add(jobData, jobOptions) {
        return await this.jobQueue.add(jobData, jobOptions);
    }
    async getJob(jobId) {
        return await this.jobQueue.getJob(jobId);
    }
    async getJobs(jobTypes) {
        return await this.jobQueue.getJobs(jobTypes);
    }
    getBullObjectInstance() {
        return this.jobQueue;
    }
    async stopJob(job) {
        if (await job.isActive()) {
            await job.progress(-1);
            return true;
        }
        else {
            try {
                await job.remove();
                return true;
            }
            catch (e) {
                await job.progress(-1);
            }
        }
        return false;
    }
}
exports.Queue = Queue;
let activeQueueInstance;
function getInstance() {
    if (activeQueueInstance === undefined) {
        activeQueueInstance = new Queue();
    }
    return activeQueueInstance;
}
exports.getInstance = getInstance;
//# sourceMappingURL=Queue.js.map