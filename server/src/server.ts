import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import apiRouter from './routes/index.js';
import { getJobQueue } from './jobs/index.js';
import { User } from './models/user.model.js';
import { seedDatabase } from './jobs/seed.js';

const app = express();

// Ensure upload directory exists
if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

// 1. Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. CORS allowlist
app.use(
  cors({
    origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

// 3. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 500, // Limit each IP to 500 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } },
});
app.use('/api', limiter);

// 4. Body parsing
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 5. Static uploads serving
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

// 6. API routes
app.use('/api', apiRouter);

// 7. Global 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Requested API endpoint does not exist' },
  });
});

// 8. Global error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ServerError]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  });
});

// Start Server
async function startServer() {
  try {
    await connectDB();

    // Auto-seed if database is empty (e.g. initial run or in-memory fallback)
    try {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('[Server] Database is empty. Auto-seeding initial staff, applicants, and cases...');
        await seedDatabase();
      }
    } catch (seedErr: any) {
      console.warn('[Server] Auto-seed check warning:', seedErr.message);
    }

    const queue = getJobQueue();
    queue.startWorker();

    app.listen(ENV.PORT, () => {
      console.log(`===============================================`);
      console.log(`KYC-Flow Core Server running on port: ${ENV.PORT}`);
      console.log(`Environment: ${ENV.NODE_ENV}`);
      console.log(`API URL: http://localhost:${ENV.PORT}/api`);
      console.log(`Static Uploads: http://localhost:${ENV.PORT}/uploads`);
      console.log(`===============================================`);
    });
  } catch (error: any) {
    console.error('Failed to initialize server:', error.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
