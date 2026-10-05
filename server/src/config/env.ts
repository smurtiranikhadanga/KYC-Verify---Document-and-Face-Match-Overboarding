import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config(); // Fallback to current working directory

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kyc-flow',
  JWT_SECRET: process.env.JWT_SECRET || 'kyc-flow-dev-secret-key-change-in-prod-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  USE_MEMORY_DB: process.env.USE_MEMORY_DB === 'true',
};
