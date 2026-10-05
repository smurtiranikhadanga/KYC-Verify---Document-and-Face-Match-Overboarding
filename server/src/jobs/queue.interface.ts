export interface ProcessCaseJobData {
  caseId: string;
  applicantId: string;
  country: string;
  documentType: string;
  frontArtifactId: string;
  backArtifactId?: string;
  selfieArtifactId: string;
}

export interface IJobQueue {
  enqueueCaseProcessing(data: ProcessCaseJobData): Promise<void>;
  startWorker(): void;
  stopWorker(): void;
}
