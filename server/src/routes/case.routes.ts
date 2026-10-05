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
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

const router = Router();

router.post('/', optionalAuth, createCase);
router.get('/:id', optionalAuth, getCaseById);
router.get('/:id/status', getCaseStatus);

router.post(
  '/:id/documents',
  optionalAuth,
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  uploadDocuments
);

router.post('/:id/selfie', optionalAuth, upload.single('selfie'), uploadSelfie);
router.post('/:id/submit', optionalAuth, submitCase);
router.post('/:id/resubmit', optionalAuth, resubmitCase);

export default router;
