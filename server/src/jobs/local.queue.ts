import { IJobQueue, ProcessCaseJobData } from './queue.interface.js';
import { processCaseJob } from './case-processor.js';

export class LocalJobQueue implements IJobQueue {
  private queue: ProcessCaseJobData[] = [];
  private isProcessing = false;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  async enqueueCaseProcessing(data: ProcessCaseJobData): Promise<void> {
    console.log(`[LocalQueue] Enqueued case for async processing: ${data.caseId}`);
    this.queue.push(data);
    // Trigger immediate async tick
    setImmediate(() => this.processNext());
  }

  startWorker(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[LocalQueue] Worker started.');
    this.timer = setInterval(() => {
      this.processNext();
    }, 1000);
  }

  stopWorker(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const job = this.queue.shift();
    if (job) {
      try {
        await processCaseJob(job);
      } catch (err: any) {
        console.error(`[LocalQueue] Error processing job ${job.caseId}:`, err.message);
      }
    }

    this.isProcessing = false;
    if (this.queue.length > 0) {
      setImmediate(() => this.processNext());
    }
  }
}
