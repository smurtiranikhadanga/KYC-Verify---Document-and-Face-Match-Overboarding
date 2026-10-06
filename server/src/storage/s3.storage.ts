import { Readable } from 'stream';
import { createHash } from 'crypto';
import { IStorageProvider, StoredFileResult } from './storage.interface.js';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3StorageProvider implements IStorageProvider {
  private bucket: string;
  private region: string;
  private s3: S3Client;

  constructor(bucket = process.env.S3_BUCKET || 'kyc-flow-artifacts', region = process.env.AWS_REGION || 'us-east-1') {
    this.bucket = bucket;
    this.region = region;
    this.s3 = new S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT, // e.g., for MinIO or custom S3 provider
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
  }

  async saveFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderPrefix = 'cases'
  ): Promise<StoredFileResult> {
    const key = `${folderPrefix}/${Date.now()}-${fileName}`;
    const hash = createHash('sha256').update(fileBuffer).digest('hex');

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      })
    );

    return {
      storageKey: key,
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
      sizeBytes: fileBuffer.length,
      mimeType,
      sha256: hash,
    };
  }

  async getFileStream(storageKey: string): Promise<Readable> {
    const result = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      })
    );
    
    if (result.Body instanceof Readable) {
      return result.Body;
    }
    
    // AWS SDK v3 sometimes returns a different type (like ReadableStream in browser).
    // In Node.js, it's typically a Readable. If not, we wrap it or throw.
    if (result.Body && typeof (result.Body as any).transformToString === 'function') {
      return result.Body as unknown as Readable;
    }
    
    throw new Error('S3 Response Body is not a readable stream');
  }

  getFilePath(storageKey: string): string {
    return `s3://${this.bucket}/${storageKey}`;
  }

  getFileUrl(storageKey: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        })
      );
      return true;
    } catch (err) {
      console.error(`Failed to delete file from S3: ${storageKey}`, err);
      return false;
    }
  }

  async getSignedUrl(storageKey: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });
    return await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }
}
