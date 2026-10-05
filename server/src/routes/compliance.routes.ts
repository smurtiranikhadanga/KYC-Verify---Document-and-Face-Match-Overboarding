import { Router } from 'express';
import {
  getConsents,
  createDsarRequest,
  getDsarRequests,
  executeDsar,
  getRetentionPolicies,
  getAuditLogs,
} from '../controllers/compliance.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

// Public DSAR creation (anyone can submit data request without mandatory login per CCPA/GDPR)
router.post('/dsar', createDsarRequest);

// Compliance staff routes
router.get(
  '/consents',
  requireAuth,
  requireRole('compliance_officer', 'senior_reviewer', 'auditor', 'admin'),
  getConsents
);

router.get(
  '/dsar',
  requireAuth,
  requireRole('compliance_officer', 'admin', 'auditor'),
  getDsarRequests
);

router.post(
  '/dsar/:id/execute',
  requireAuth,
  requireRole('compliance_officer'),
  executeDsar
);

router.get(
  '/retention',
  requireAuth,
  requireRole('compliance_officer', 'admin', 'auditor'),
  getRetentionPolicies
);

router.get(
  '/audit',
  requireAuth,
  requireRole('compliance_officer', 'auditor', 'admin'),
  getAuditLogs
);

export default router;
