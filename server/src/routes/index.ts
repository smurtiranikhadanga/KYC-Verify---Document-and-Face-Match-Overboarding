import { Router } from 'express';
import authRoutes from './auth.routes.js';
import caseRoutes from './case.routes.js';
import consentRoutes from './consent.routes.js';
import reviewRoutes from './review.routes.js';
import complianceRoutes from './compliance.routes.js';
import adminRoutes from './admin.routes.js';
import mlopsRoutes from './mlops.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/cases', caseRoutes);
router.use('/consents', consentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/compliance', complianceRoutes);
router.use('/admin', adminRoutes);
router.use('/mlops', mlopsRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'KYC-Flow Core API',
  });
});

export default router;
