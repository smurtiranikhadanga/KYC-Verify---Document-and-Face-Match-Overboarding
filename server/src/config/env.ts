import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config(); // Fallback to current working directory

// FIX AUTH-05: In production, JWT_SECRET MUST be set via environment variable.
// Never use a hardcoded default in production.
function requireEnvInProd(key: string, fallback: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[FATAL] Environment variable ${key} is required in production but not set.`);
      process.exit(1);
    }
    console.warn(`[Warning] ${key} not set. Using development fallback (NEVER use this in production).`);
    return fallback;
  }
  return value;
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kyc-flow',
  // FIX AUTH-05: JWT_SECRET has no in-code fallback in production
  JWT_SECRET: requireEnvInProd('JWT_SECRET', 'kyc-dev-only-secret-DO-NOT-USE-IN-PROD'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  // FIX DB-18: Disable silent in-memory DB fallback in production
  USE_MEMORY_DB: process.env.USE_MEMORY_DB === 'true' && process.env.NODE_ENV !== 'production',
};
