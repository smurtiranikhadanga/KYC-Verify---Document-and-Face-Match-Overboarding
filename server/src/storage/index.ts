import { IStorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './local.storage.js';
import { S3StorageProvider } from './s3.storage.js';
import { ENV } from '../config/env.js';

let storageInstance: IStorageProvider;

export function getStorageProvider(): IStorageProvider {
  if (!storageInstance) {
    if (ENV.STORAGE_PROVIDER === 's3') {
      storageInstance = new S3StorageProvider();
    } else {
      storageInstance = new LocalStorageProvider();
    }
  }
  return storageInstance;
}

export * from './storage.interface.js';
export * from './local.storage.js';
export * from './s3.storage.js';
