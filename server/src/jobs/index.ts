import { IJobQueue } from './queue.interface.js';
import { LocalJobQueue } from './local.queue.js';
import { RabbitMQJobQueue } from './rabbitmq.queue.js';

let queueInstance: IJobQueue;

export function getJobQueue(): IJobQueue {
  if (!queueInstance) {
    if (process.env.USE_RABBITMQ === 'true') {
      queueInstance = new RabbitMQJobQueue();
    } else {
      queueInstance = new LocalJobQueue();
    }
    queueInstance.startWorker();
  }
  return queueInstance;
}

export * from './queue.interface.js';
export * from './local.queue.js';
export * from './rabbitmq.queue.js';
export * from './case-processor.js';
