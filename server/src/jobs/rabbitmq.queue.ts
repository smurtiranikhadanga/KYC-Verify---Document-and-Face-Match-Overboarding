import { IJobQueue, ProcessCaseJobData } from './queue.interface.js';

/**
 * RabbitMQJobQueue
 * Future-ready adapter for RabbitMQ AMQP cluster with quorum queues and KEDA autoscaling.
 */
export class RabbitMQJobQueue implements IJobQueue {
  private url: string;

  constructor(url = process.env.RABBITMQ_URL || 'amqp://localhost:5672') {
    this.url = url;
  }

  async enqueueCaseProcessing(data: ProcessCaseJobData): Promise<void> {
    console.log(`[RabbitMQQueue] Prepared to publish case ${data.caseId} to queue at ${this.url}`);
    // In production: channel.sendToQueue('kyc.cases.processing', Buffer.from(JSON.stringify(data)), { persistent: true });
  }

  startWorker(): void {
    console.log(`[RabbitMQQueue] Worker listener prepared for AMQP endpoint: ${this.url}`);
  }

  stopWorker(): void {
    console.log('[RabbitMQQueue] Worker stopped.');
  }
}
