import { IJobQueue } from './queue.interface.js';
import { LocalJobQueue } from './local.queue.js';
import { BullMQJobQueue } from './bullmq.queue.js';

let queueInstance: IJobQueue;

export function getJobQueue(): IJobQueue {
  if (!queueInstance) {
    if (process.env.USE_REDIS === 'true' || process.env.REDIS_URL) {
      queueInstance = new BullMQJobQueue();
    } else {
      queueInstance = new LocalJobQueue();
    }
    queueInstance.startWorker();
  }
  return queueInstance;
}

export * from './queue.interface.js';
export * from './local.queue.js';
export * from './bullmq.queue.js';
export * from './case-processor.js';
