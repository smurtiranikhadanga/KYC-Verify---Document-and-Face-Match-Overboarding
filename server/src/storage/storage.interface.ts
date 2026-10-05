import { Readable } from 'stream';

export interface StoredFileResult {
  storageKey: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
}

export interface IStorageProvider {
  saveFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderPrefix?: string
  ): Promise<StoredFileResult>;

  getFileStream(storageKey: string): Promise<Readable>;

  getFilePath(storageKey: string): string;

  getFileUrl(storageKey: string): string;

  deleteFile(storageKey: string): Promise<boolean>;

  getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
}
