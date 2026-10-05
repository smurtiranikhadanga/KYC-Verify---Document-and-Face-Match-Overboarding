import { Readable } from 'stream';
import { IStorageProvider, StoredFileResult } from './storage.interface.js';

/**
 * S3StorageProvider
 * Prepared stub for production AWS S3 / MinIO integration.
 * Enables zero-downtime swap from local disk storage to S3 bucket without changing domain services.
 */
export class S3StorageProvider implements IStorageProvider {
  private bucket: string;
  private region: string;

  constructor(bucket = process.env.S3_BUCKET || 'kyc-flow-artifacts', region = process.env.AWS_REGION || 'us-east-1') {
    this.bucket = bucket;
    this.region = region;
  }

  async saveFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderPrefix = 'cases'
  ): Promise<StoredFileResult> {
    const key = `${folderPrefix}/${Date.now()}-${fileName}`;
    // In production: PutObjectCommand to AWS S3 with SSE-KMS
    return {
      storageKey: key,
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
      sizeBytes: fileBuffer.length,
      mimeType,
      sha256: 'mock-sha256-for-s3-provider',
    };
  }

  async getFileStream(_storageKey: string): Promise<Readable> {
    throw new Error('S3StorageProvider getFileStream requires AWS S3 SDK integration.');
  }

  getFilePath(storageKey: string): string {
    return `s3://${this.bucket}/${storageKey}`;
  }

  getFileUrl(storageKey: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
  }

  async deleteFile(_storageKey: string): Promise<boolean> {
    // In production: DeleteObjectCommand
    return true;
  }

  async getSignedUrl(storageKey: string, expiresInSeconds = 300): Promise<string> {
    // In production: getSignedUrl from @aws-sdk/s3-request-presigner
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}?expiresIn=${expiresInSeconds}`;
  }
}
