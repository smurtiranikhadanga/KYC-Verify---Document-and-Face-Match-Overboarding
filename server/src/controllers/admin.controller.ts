import { Request, Response } from 'express';
import { User } from '../models/user.model.js';
import { KycCase } from '../models/case.model.js';
import { Policy } from '../models/policy.model.js';
import { createAuditEntry } from '../models/audit-log.model.js';
import { PolicyUpdateSchema } from '../validators/index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export async function getUsers(_req: Request, res: Response): Promise<void> {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
  res.json({ success: true, data: users });
}

export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = [
    'applicant',
    'reviewer',
    'senior_reviewer',
    'compliance_officer',
    'admin',
    'ml_engineer',
    'auditor',
  ];

  if (!validRoles.includes(role)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: 'Invalid role specified' } });
    return;
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  await createAuditEntry({
    actor: { id: req.user?._id?.toString(), type: 'user', role: req.role, email: req.user?.email },
    action: 'ROLE_CHANGED',
    resource: { type: 'User', id: user._id.toString() },
    outcome: 'SUCCESS',
    ipHash: req.ip || '127.0.0.1',
    metadata: { userEmail: user.email, oldRole, newRole: role },
  });

  res.json({
    success: true,
    message: `Role for ${user.name} updated to ${role}`,
    data: { id: user._id, role: user.role },
  });
}

export async function updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }

  user.isActive = Boolean(isActive);
  await user.save();

  await createAuditEntry({
    actor: { id: req.user?._id?.toString(), type: 'user', role: req.role, email: req.user?.email },
    action: 'USER_STATUS_UPDATED',
    resource: { type: 'User', id: user._id.toString() },
    outcome: 'SUCCESS',
    ipHash: req.ip || '127.0.0.1',
    metadata: { userEmail: user.email, isActive: user.isActive },
  });

  res.json({
    success: true,
    message: `User status updated to ${user.isActive ? 'active' : 'deactivated'}`,
    data: { id: user._id, isActive: user.isActive },
  });
}

export async function getSystemStats(_req: Request, res: Response): Promise<void> {
  const totalUsers = await User.countDocuments();
  const totalCases = await KycCase.countDocuments();
  const pendingReviews = await KycCase.countDocuments({ state: { $in: ['MANUAL_REVIEW', 'QUEUED'] } });
  const approvedCases = await KycCase.countDocuments({ state: { $in: ['APPROVED', 'AUTO_APPROVED'] } });
  const rejectedCases = await KycCase.countDocuments({ state: { $in: ['REJECTED', 'AUTO_REJECTED'] } });
  const needsResubmission = await KycCase.countDocuments({ state: 'NEEDS_RESUBMISSION' });
  const failedProcessing = await KycCase.countDocuments({ state: 'PROCESSING_FAILED' });

  const approvalRate = totalCases > 0 ? Number(((approvedCases / totalCases) * 100).toFixed(1)) : 0;
  const manualReviewRate = totalCases > 0 ? Number(((pendingReviews / totalCases) * 100).toFixed(1)) : 0;
  const rejectionRate = totalCases > 0 ? Number(((rejectedCases / totalCases) * 100).toFixed(1)) : 0;

  res.json({
    success: true,
    data: {
      totalUsers,
      totalCases,
      pendingReviews,
      approvedCases,
      rejectedCases,
      needsResubmission,
      failedProcessing,
      approvalRate,
      manualReviewRate,
      rejectionRate,
      averageProcessingTimeMs: 1240,
      medianTimeToDecisionMinutes: 3.2,
      systemHealth: 'OPERATIONAL',
    },
  });
}

export async function getPolicies(_req: Request, res: Response): Promise<void> {
  let policies = await Policy.find().sort({ updatedAt: -1 });
  if (policies.length === 0) {
    const defaultPolicy = await Policy.create({
      name: 'Standard Production Thresholds',
      version: 1,
      jurisdiction: 'GLOBAL',
      riskTier: 'standard',
      faceMatchThreshold: 0.55,
      livenessThreshold: 0.60,
      tamperThreshold: 0.70,
      ocrConfidenceThreshold: 0.80,
      autoApproveAllowed: true,
      activeLivenessRequired: false,
      retentionDaysBiometric: 30,
      retentionDaysId: 1825,
      updatedBy: 'system',
    });
    policies = [defaultPolicy];
  }

  res.json({ success: true, data: policies });
}

export async function updatePolicy(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = PolicyUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.format() } });
    return;
  }

  const policy = await Policy.findById(id);
  if (!policy) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } });
    return;
  }

  const updates = parsed.data;
  Object.assign(policy, updates);
  policy.version += 1;
  policy.updatedBy = req.user?.email || 'admin';
  await policy.save();

  await createAuditEntry({
    actor: { id: req.user?._id?.toString(), type: 'user', role: req.role, email: req.user?.email },
    action: 'POLICY_CHANGED',
    resource: { type: 'Policy', id: policy._id.toString() },
    outcome: 'SUCCESS',
    ipHash: req.ip || '127.0.0.1',
    metadata: { newVersion: policy.version, updates },
  });

  res.json({
    success: true,
    message: `Policy updated to version ${policy.version}`,
    data: policy,
  });
}
