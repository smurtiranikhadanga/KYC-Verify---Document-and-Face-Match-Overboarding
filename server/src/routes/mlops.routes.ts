import { Router } from 'express';
import {
  getModelRegistry,
  getModelMetrics,
  getDriftAnalysis,
  getModelRuns,
  getAnalyticsFunnel,
} from '../controllers/mlops.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ml_engineer', 'admin', 'compliance_officer', 'auditor'));

router.get('/models', getModelRegistry);
router.get('/metrics', getModelMetrics);
router.get('/drift', getDriftAnalysis);
router.get('/runs', getModelRuns);
router.get('/funnel', getAnalyticsFunnel);

export default router;
