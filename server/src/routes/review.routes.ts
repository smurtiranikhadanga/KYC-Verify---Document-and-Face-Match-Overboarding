import { Router } from 'express';
import {
  getReviewQueue,
  claimCase,
  decideCase,
  revealPii,
  overrideDecision,
} from '../controllers/review.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

// Queue and claim available to reviewers, senior reviewers, compliance, auditor
router.get(
  '/queue',
  requireAuth,
  requireRole('reviewer', 'senior_reviewer', 'compliance_officer', 'auditor', 'admin'),
  getReviewQueue
);

router.post(
  '/:caseId/claim',
  requireAuth,
  requireRole('reviewer', 'senior_reviewer'),
  claimCase
);

// Decision actions
router.post(
  '/:caseId/decide',
  requireAuth,
  requireRole('reviewer', 'senior_reviewer'),
  decideCase
);

// Individual shorthand endpoints
router.post('/:caseId/approve', requireAuth, requireRole('reviewer', 'senior_reviewer'), (req, res) => {
  req.body.action = 'APPROVE';
  decideCase(req, res);
});

router.post('/:caseId/reject', requireAuth, requireRole('reviewer', 'senior_reviewer'), (req, res) => {
  req.body.action = 'REJECT';
  decideCase(req, res);
});

router.post('/:caseId/resubmit', requireAuth, requireRole('reviewer', 'senior_reviewer'), (req, res) => {
  req.body.action = 'RESUBMIT';
  decideCase(req, res);
});

router.post('/:caseId/escalate', requireAuth, requireRole('reviewer', 'senior_reviewer'), (req, res) => {
  req.body.action = 'ESCALATE';
  decideCase(req, res);
});

// Reveal PII: requires senior_reviewer or compliance_officer with justification
router.post(
  '/:caseId/reveal-pii',
  requireAuth,
  requireRole('senior_reviewer', 'compliance_officer'),
  revealPii
);

// Four-eyes override: requires senior_reviewer
router.post(
  '/:caseId/override',
  requireAuth,
  requireRole('senior_reviewer'),
  overrideDecision
);

export default router;
