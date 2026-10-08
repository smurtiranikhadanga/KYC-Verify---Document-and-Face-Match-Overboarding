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
  requireRole('reviewer', 'senior_reviewer', 'admin'),
  claimCase
);

// Decision actions
router.post(
  '/:caseId/decide',
  requireAuth,
  requireRole('reviewer', 'senior_reviewer', 'admin'),
  decideCase
);

// Individual shorthand endpoints
router.post('/:caseId/approve', requireAuth, requireRole('reviewer', 'senior_reviewer', 'admin'), (req, res) => {
  req.body.action = 'APPROVE';
  decideCase(req, res);
});

router.post('/:caseId/reject', requireAuth, requireRole('reviewer', 'senior_reviewer', 'admin'), (req, res) => {
  req.body.action = 'REJECT';
  decideCase(req, res);
});

router.post('/:caseId/resubmit', requireAuth, requireRole('reviewer', 'senior_reviewer', 'admin'), (req, res) => {
  req.body.action = 'RESUBMIT';
  decideCase(req, res);
});

router.post('/:caseId/escalate', requireAuth, requireRole('reviewer', 'senior_reviewer', 'admin'), (req, res) => {
  req.body.action = 'ESCALATE';
  decideCase(req, res);
});

// Reveal PII: requires senior_reviewer, compliance_officer, or admin with justification
router.post(
  '/:caseId/reveal-pii',
  requireAuth,
  requireRole('senior_reviewer', 'compliance_officer', 'admin'),
  revealPii
);

// Four-eyes override: requires senior_reviewer or admin
router.post(
  '/:caseId/override',
  requireAuth,
  requireRole('senior_reviewer', 'admin'),
  overrideDecision
);

export default router;
