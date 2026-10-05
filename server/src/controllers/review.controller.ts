import { Response } from 'express';
import { KycCase } from '../models/case.model.js';
import { ReviewTask } from '../models/review-task.model.js';
import { createAuditEntry } from '../models/audit-log.model.js';
import { maskCaseData } from '../utils/masking.utils.js';
import { ReviewDecisionSchema, RevealPiiSchema, OverrideSchema } from '../validators/index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export async function getReviewQueue(req: AuthRequest, res: Response): Promise<void> {
  const { status, risk, jurisdiction, docType, search } = req.query;

  const query: any = {};

  if (status) {
    query.state = status;
  } else {
    // Default queue shows MANUAL_REVIEW, QUEUED, PROCESSING
    query.state = { $in: ['MANUAL_REVIEW', 'QUEUED', 'PROCESSING', 'NEEDS_RESUBMISSION'] };
  }

  if (risk) {
    if (risk === 'high') query.riskScore = { $gte: 60 };
    else if (risk === 'medium') query.riskScore = { $gte: 30, $lt: 60 };
    else if (risk === 'low') query.riskScore = { $lt: 30 };
  }

  if (jurisdiction) query.jurisdiction = jurisdiction;
  if (docType) query.documentType = docType;

  if (search) {
    query.caseId = { $regex: search, $options: 'i' };
  }

  const cases = await KycCase.find(query)
    .sort({ 'decision.priority': -1, createdAt: 1 })
    .populate('assignedTo', 'name email')
    .limit(100);

  // Return queue items (no sensitive PII in queue lists as per Dashboard.md)
  const queueItems = cases.map((c) => ({
    _id: c._id,
    caseId: c.caseId,
    createdAt: c.createdAt,
    ageMinutes: Math.round((Date.now() - new Date(c.createdAt).getTime()) / 60000),
    slaDueAt: c.slaDueAt || new Date(new Date(c.createdAt).getTime() + 2 * 60 * 60 * 1000),
    riskScore: c.riskScore,
    riskFlags: c.riskFlags,
    jurisdiction: c.jurisdiction,
    documentType: c.documentType,
    state: c.state,
    assignedTo: (c.assignedTo as any)?.name || 'Unassigned',
    priority: c.decision?.priority || 50,
  }));

  res.json({
    success: true,
    data: queueItems,
  });
}

export async function claimCase(req: AuthRequest, res: Response): Promise<void> {
  const { caseId } = req.params;
  const userId = req.user?._id;

  const kycCase = await KycCase.findOne({ caseId });
  if (!kycCase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    return;
  }

  kycCase.assignedTo = userId as any;
  await kycCase.save();

  await ReviewTask.findOneAndUpdate(
    { caseId },
    {
      caseId,
      status: 'CLAIMED',
      claimedBy: userId,
      claimExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30-min TTL lock
    },
    { upsert: true }
  );

  await createAuditEntry({
    actor: { id: userId?.toString(), type: 'user', role: req.role, email: req.user?.email },
    action: 'CASE_CLAIMED',
    resource: { type: 'KycCase', id: caseId },
    outcome: 'SUCCESS',
    ipHash: req.ip || '127.0.0.1',
  });

  res.json({
    success: true,
    message: `Case ${caseId} claimed successfully`,
    data: { caseId, assignedTo: req.user?.name },
  });
}

export async function decideCase(req: AuthRequest, res: Response): Promise<void> {
  const { caseId } = req.params;
  const parsed = ReviewDecisionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.format() } });
    return;
  }

  const { action, reasonCodes, notes } = parsed.data;
  const kycCase = await KycCase.findOne({ caseId });

  if (!kycCase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    return;
  }

  let finalState: any = 'APPROVED';
  if (action === 'APPROVE') finalState = 'APPROVED';
  else if (action === 'REJECT') finalState = 'REJECTED';
  else if (action === 'RESUBMIT') finalState = 'NEEDS_RESUBMISSION';
  else if (action === 'ESCALATE') finalState = 'MANUAL_REVIEW';

  // Check Four-Eyes override rule: if case was AUTO_REJECTED or has high risk score (>=70)
  // and non-senior reviewer tries to approve it, require senior reviewer approval
  if (action === 'APPROVE' && (kycCase.riskScore >= 70 || kycCase.state === 'AUTO_REJECTED')) {
    if (req.role !== 'senior_reviewer') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FOUR_EYES_REQUIRED',
          message: 'Overriding high-risk or auto-rejected cases requires Senior Reviewer authorization.',
        },
      });
      return;
    }
  }

  kycCase.state = finalState;
  kycCase.stateHistory.push({
    state: finalState,
    at: new Date(),
    by: req.user?.email || 'reviewer',
    notes: notes || `Review decision: ${action}. Reasons: ${reasonCodes.join(', ')}`,
  });

  kycCase.decision = {
    outcome: finalState,
    reasonCodes,
    policyVersion: kycCase.decision?.policyVersion || 1,
    decidedBy: req.user?.email || 'reviewer',
    decidedAt: new Date(),
    notes,
  };

  await kycCase.save();

  await ReviewTask.findOneAndUpdate(
    { caseId },
    {
      status: action === 'ESCALATE' ? 'ESCALATED' : 'COMPLETED',
      decision: finalState,
      reasonCodes,
      notes,
    }
  );

  await createAuditEntry({
    actor: { id: req.user?._id?.toString(), type: 'user', role: req.role, email: req.user?.email },
    action: `CASE_${action}`,
    resource: { type: 'KycCase', id: caseId },
    outcome: 'SUCCESS',
    ipHash: req.ip || '127.0.0.1',
    metadata: { finalState, reasonCodes, notes },
  });

  res.json({
    success: true,
    message: `Case ${caseId} has been updated to ${finalState}`,
    data: {
      caseId,
      state: finalState,
      decidedBy: req.user?.email,
      decidedAt: kycCase.decision.decidedAt,
    },
  });
}

export async function revealPii(req: AuthRequest, res: Response): Promise<void> {
  const { caseId } = req.params;

  // Authorization check: only senior_reviewer and compliance_officer can reveal
  if (req.role !== 'senior_reviewer' && req.role !== 'compliance_officer') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only Senior Reviewers or Compliance Officers can reveal masked PII.' },
    });
    return;
  }

  const parsed = RevealPiiSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.format() } });
    return;
  }

  const { justification } = parsed.data;
  const kycCase = await KycCase.findOne({ caseId });

  if (!kycCase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    return;
  }

  // Create audit event for PII reveal with justification
  await createAuditEntry({
    actor: { id: req.user?._id?.toString(), type: 'user', role: req.role, email: req.user?.email },
    action: 'PII_REVEALED',
    resource: { type: 'KycCase', id: caseId },
    outcome: 'SUCCESS',
    ipHash: req.ip || '127.0.0.1',
    metadata: {
      justification,
      revealedFields: ['fullName', 'idNumber', 'dob', 'address', 'rawText'],
    },
  });

  // Return unmasked case data
  const unmasked = maskCaseData(kycCase, true);

  res.json({
    success: true,
    message: 'PII revealed. Action has been recorded in the immutable audit ledger.',
    data: unmasked,
  });
}

export async function overrideDecision(req: AuthRequest, res: Response): Promise<void> {
  const { caseId } = req.params;

  if (req.role !== 'senior_reviewer') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Four-eyes decision override requires Senior Reviewer privileges.' },
    });
    return;
  }

  const parsed = OverrideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.format() } });
    return;
  }

  const { targetOutcome, justification } = parsed.data;
  const kycCase = await KycCase.findOne({ caseId });

  if (!kycCase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    return;
  }

  const previousState = kycCase.state;
  kycCase.state = targetOutcome;
  kycCase.stateHistory.push({
    state: targetOutcome,
    at: new Date(),
    by: req.user?.email || 'senior_reviewer',
    notes: `Four-Eyes Override by Senior Reviewer. Previous state: ${previousState}. Justification: ${justification}`,
  });

  if (!kycCase.decision) {
    kycCase.decision = {
      outcome: targetOutcome,
      reasonCodes: ['SENIOR_OVERRIDE'],
      policyVersion: 1,
      decidedBy: req.user?.email || 'senior_reviewer',
      decidedAt: new Date(),
    };
  }

  kycCase.decision.outcome = targetOutcome;
  kycCase.decision.overrideReason = justification;
  kycCase.decision.seniorApprovedBy = req.user?.email;
  kycCase.decision.decidedAt = new Date();

  await kycCase.save();

  await createAuditEntry({
    actor: { id: req.user?._id?.toString(), type: 'user', role: req.role, email: req.user?.email },
    action: 'DECISION_OVERRIDDEN',
    resource: { type: 'KycCase', id: caseId },
    outcome: 'SUCCESS',
    ipHash: req.ip || '127.0.0.1',
    metadata: { previousState, targetOutcome, justification },
  });

  res.json({
    success: true,
    message: `Case ${caseId} successfully overridden to ${targetOutcome}`,
    data: {
      caseId,
      state: targetOutcome,
      seniorApprovedBy: req.user?.email,
      overrideReason: justification,
    },
  });
}
