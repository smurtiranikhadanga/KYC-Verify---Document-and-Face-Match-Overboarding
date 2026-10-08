import { Router } from 'express';
import {
  getUsers,
  updateUserRole,
  updateUserStatus,
  getSystemStats,
  getPolicies,
  updatePolicy,
} from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/users', requireRole('admin', 'auditor'), getUsers);
router.patch('/users/:id/role', requireRole('admin'), updateUserRole);
router.patch('/users/:id/status', requireRole('admin'), updateUserStatus);

router.get('/stats', requireRole('admin', 'reviewer', 'senior_reviewer', 'compliance_officer', 'ml_engineer', 'auditor'), getSystemStats);

router.get('/policies', requireRole('admin', 'compliance_officer', 'auditor'), getPolicies);
router.patch('/policies/:id', requireRole('admin', 'compliance_officer'), updatePolicy);

export default router;
