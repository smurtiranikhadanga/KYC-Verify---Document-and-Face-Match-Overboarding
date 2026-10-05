import { Router } from 'express';
import { createConsent, withdrawConsent, getConsents } from '../controllers/consent.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

router.post('/', optionalAuth, createConsent);
router.delete('/:id', optionalAuth, withdrawConsent);
router.get('/', requireAuth, requireRole('compliance_officer', 'senior_reviewer', 'auditor', 'admin'), getConsents);

export default router;
