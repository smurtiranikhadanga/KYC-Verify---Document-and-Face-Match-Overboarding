import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { IStorageProvider, StoredFileResult } from './storage.interface.js';
import { ENV } from '../config/env.js';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || ENV.UPLOAD_DIR;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderPrefix: string = 'cases'
  ): Promise<StoredFileResult> {
    const targetFolder = path.join(this.baseDir, folderPrefix);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const ext = path.extname(fileName) || '.jpg';
    const randomId = crypto.randomBytes(16).toString('hex');
    const safeFileName = `${Date.now()}-${randomId}${ext}`;
    const relativeKey = path.join(folderPrefix, safeFileName).replace(/\\/g, '/');
    const absolutePath = path.join(this.baseDir, relativeKey);

    await fs.promises.writeFile(absolutePath, fileBuffer);

    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    return {
      storageKey: relativeKey,
      url: `/uploads/${relativeKey}`,
      sizeBytes: fileBuffer.length,
      mimeType,
      sha256: hash,
    };
  }

  async getFileStream(storageKey: string): Promise<Readable> {
    const fullPath = this.getFilePath(storageKey);
    return fs.createReadStream(fullPath);
  }

  getFilePath(storageKey: string): string {
    // Prevent directory traversal
    const safePath = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
    return path.join(this.baseDir, safePath);
  }

  getFileUrl(storageKey: string): string {
    return `/uploads/${storageKey.replace(/\\/g, '/')}`;
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    try {
      const fullPath = this.getFilePath(storageKey);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getSignedUrl(storageKey: string, _expiresInSeconds = 300): Promise<string> {
    // For local storage, returns the access URL (can append a signed HMAC token if desired)
    return this.getFileUrl(storageKey);
  }
}
