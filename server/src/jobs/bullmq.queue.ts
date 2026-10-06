import { Queue, Worker, Job } from 'bullmq';
import { IJobQueue, ProcessCaseJobData } from './queue.interface.js';
import { processCaseJob } from './case-processor.js';

export class BullMQJobQueue implements IJobQueue {
  private queue: Queue;
  private worker?: Worker;

  constructor(redisUrl = process.env.REDIS_URL || 'redis://localhost:6379') {
    this.queue = new Queue('kyc-cases', {
      connection: {
        url: redisUrl,
      },
    });
  }

  async enqueueCaseProcessing(data: ProcessCaseJobData): Promise<void> {
    console.log(`[BullMQQueue] Enqueuing case ${data.caseId}`);
    await this.queue.add('process-case', data, {
      jobId: data.caseId, // Prevents duplicate jobs for the same case
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false, // Keep failed jobs in DLQ equivalent
    });
  }

  startWorker(): void {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`[BullMQQueue] Worker started on ${redisUrl}`);
    
    this.worker = new Worker(
      'kyc-cases',
      async (job: Job) => {
        const data = job.data as ProcessCaseJobData;
        await processCaseJob(data);
      },
      {
        connection: {
          url: redisUrl,
        },
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[BullMQQueue] Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[BullMQQueue] Job ${job?.id} failed:`, err);
    });
  }

  stopWorker(): void {
    console.log('[BullMQQueue] Worker stopped.');
    this.worker?.close();
  }
}
