import { Router } from 'express';
import { createConsent, withdrawConsent, getConsents } from '../controllers/consent.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

// FIX AUTH-03: Consent creation and withdrawal require authentication
router.post('/', requireAuth, createConsent);
router.delete('/:id', requireAuth, withdrawConsent);
router.get('/', requireAuth, requireRole('compliance_officer', 'senior_reviewer', 'reviewer', 'auditor', 'admin'), getConsents);

export default router;
