import { Router } from 'express';
import multer from 'multer';
import {
  createCase,
  getCaseById,
  uploadDocuments,
  uploadSelfie,
  submitCase,
  getCaseStatus,
  resubmitCase,
} from '../controllers/case.controller.js';
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    // FIX SEC-02: MIME type allowlist enforced at multer level too
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

const router = Router();

const CASE_PERMITTED_ROLES = ['applicant', 'reviewer', 'senior_reviewer', 'admin', 'compliance_officer', 'ml_engineer', 'auditor'] as const;

// All mutation routes require authentication
// Case creation requires auth so applicantId comes from token, not body
router.post('/', requireAuth, requireRole(...CASE_PERMITTED_ROLES), createCase);

// Case reads require auth; ownership is checked inside controller
router.get('/:id', requireAuth, getCaseById);

// Status requires auth
router.get('/:id/status', requireAuth, requireRole(...CASE_PERMITTED_ROLES), getCaseStatus);

// Upload and submit require auth
router.post(
  '/:id/documents',
  requireAuth,
  requireRole(...CASE_PERMITTED_ROLES),
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  uploadDocuments
);

router.post('/:id/selfie', requireAuth, requireRole(...CASE_PERMITTED_ROLES), upload.single('selfie'), uploadSelfie);

// submit and resubmit require auth + state checks (in controller)
router.post('/:id/submit', requireAuth, requireRole(...CASE_PERMITTED_ROLES), submitCase);
router.post('/:id/resubmit', requireAuth, requireRole(...CASE_PERMITTED_ROLES), resubmitCase);

export default router;
