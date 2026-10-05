import mongoose from 'mongoose';
import { ENV } from './env.js';

let mongodInstance: any = null;

export async function connectDB(): Promise<void> {
  try {
    // Set strictQuery
    mongoose.set('strictQuery', false);

    console.log(`[DB] Attempting connection to MongoDB at: ${ENV.MONGODB_URI}...`);
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('[DB] Connected to MongoDB successfully.');
  } catch (err: any) {
    console.warn(`[DB] Could not connect to external MongoDB: ${err.message}`);
    console.log('[DB] Initializing embedded in-memory MongoDB server for local development...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        instance: {
          dbName: 'kyc-flow',
        }
      });
      const uri = mongodInstance.getUri();
      console.log(`[DB] Embedded MongoDB running at: ${uri}`);
      await mongoose.connect(uri);
      console.log('[DB] Successfully connected to in-memory MongoDB instance.');
    } catch (memErr: any) {
      console.error('[DB] Failed to launch in-memory MongoDB:', memErr.message);
      throw memErr;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}
