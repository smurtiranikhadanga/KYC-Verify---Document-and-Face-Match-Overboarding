import express, { Request, Response, NextFunction } from 'express';
import 'express-async-errors'; // FIX N-02: Async error handling
import cors from 'cors';

// FIX N-02: Process-level error handling for supervised restarts
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  process.exit(1);
});
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import apiRouter from './routes/index.js';
import { getJobQueue } from './jobs/index.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { Artifact } from './models/artifact.model.js';
import { KycCase } from './models/case.model.js';

const app = express();

// Ensure upload directory exists
if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

// 1. Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-origin' }, // FIX SEC-01: was cross-origin
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
  })
);

// 2. CORS allowlist
app.use(
  cors({
    origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
    credentials: true,
  })
);

// FIX AUTH-04: cookie-parser is required for req.cookies to work
app.use(cookieParser());

// CSRF Protection: require a custom header on state-changing requests
app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'CSRF token missing or invalid (missing X-Requested-With)' } });
      return;
    }
  }
  next();
});

// 3. Rate limiting (accommodates real-time polling in staff portal)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: ENV.NODE_ENV === 'production' ? 5000 : 50000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' || ENV.NODE_ENV !== 'production',
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } },
});

// FIX AUTH-01: Strict rate limit on OTP request endpoint
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: ENV.NODE_ENV === 'production' ? 10 : 150,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' || ENV.NODE_ENV !== 'production',
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many OTP requests. Try again in 15 minutes.' } },
});

app.use('/api', generalLimiter);
app.use('/api/auth/request-otp', otpLimiter);

// 4. Body parsing
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ─────────────────────────────────────────────────────────────────────────────
// FIX SEC-01: Remove express.static('/uploads') — it served ID documents and
// selfies with NO authentication. Replace with an authenticated file-serving
// endpoint that checks ownership before returning file bytes.
// ─────────────────────────────────────────────────────────────────────────────
// Serve mock demonstration uploads statically so seeded review cases can display images in <img> tags
app.use('/uploads/mock', express.static(path.join(ENV.UPLOAD_DIR, 'mock')));

app.get('/uploads/*', requireAuth as any, async (req: any, res: Response) => {
  try {
    const relativePath = req.params[0];
    const fullPath = path.join(ENV.UPLOAD_DIR, relativePath);

    // Prevent path traversal
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadDir = path.resolve(ENV.UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid path' } });
      return;
    }

    if (!fs.existsSync(resolvedPath)) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
      return;
    }

    // Find the artifact to check ownership
    const artifact = await Artifact.findOne({ storageKey: relativePath });
    if (!artifact) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Artifact not found' } });
      return;
    }

    // Ownership: applicants can only view their own case files
    if (req.role === 'applicant' && req.applicant) {
      const kycCase = await KycCase.findOne({ caseId: artifact.caseId });
      if (!kycCase || kycCase.applicantId.toString() !== req.applicant._id.toString()) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        return;
      }
    }

    // Serve the file with correct content-type
    // FIX SEC-02: Use stored mimeType, NOT the client-supplied extension
    const safeContentType = artifact.mimeType || 'application/octet-stream';
    res.setHeader('Content-Type', safeContentType);
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'File serving error' } });
  }
});

// 6. API routes
app.use('/api', apiRouter);

// 7. Global 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Requested endpoint does not exist' },
  });
});

// 8. Global error handling — FIX: never expose internal error.message to clients
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ServerError]', err);
  const status = err.status || 500;

  // FIX: Map known error types without exposing internal details
  let publicMessage = 'An unexpected error occurred';
  let code = 'INTERNAL_SERVER_ERROR';

  if (err.name === 'CastError' || err.message?.includes('Cast to ObjectId')) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid identifier format' } });
    return;
  }
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') publicMessage = 'File too large. Maximum 10MB allowed.';
    else publicMessage = 'File upload error.';
    code = 'UPLOAD_ERROR';
    res.status(400).json({ success: false, error: { code, message: publicMessage } });
    return;
  }
  if (status === 400) {
    code = err.code || 'BAD_REQUEST';
    publicMessage = 'Bad request';
  }

  res.status(status).json({ success: false, error: { code, message: publicMessage } });
});

// Start Server
async function startServer() {
  try {
    await connectDB();

    if (ENV.NODE_ENV === 'development') {
      const { User } = await import('./models/user.model.js');
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('[Seed] Empty development database detected. Auto-seeding test data...');
        const { seedDatabase } = await import('./jobs/seed.js');
        await seedDatabase();
      }
    }

    const queue = getJobQueue();
    queue.startWorker();

    app.listen(ENV.PORT, () => {
      console.log(`===============================================`);
      console.log(`KYC-Flow Core Server running on port: ${ENV.PORT}`);
      console.log(`Environment: ${ENV.NODE_ENV}`);
      console.log(`API URL: http://localhost:${ENV.PORT}/api`);
      console.log(`Authenticated file serving: http://localhost:${ENV.PORT}/uploads/*`);
      console.log(`===============================================`);
    });
  } catch (error: any) {
    console.error('Failed to initialize server:', error.message);
    process.exit(1);
  }
}

// Support Vercel Serverless Function execution
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (process.env.VERCEL) {
    try {
      await connectDB();
    } catch (e: any) {
      console.error('[DB] Serverless connect error:', e.message);
    }
  }
  next();
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
}

export default app;
