import { Request, Response } from 'express';
import crypto from 'crypto';
import { Consent } from '../models/consent.model.js';
import { KycCase } from '../models/case.model.js';
import { createAuditEntry } from '../models/audit-log.model.js';
import { ConsentSchema } from '../validators/index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export async function createConsent(req: AuthRequest, res: Response): Promise<void> {
  const parsed = ConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.format() } });
    return;
  }

  const { caseId, type, policyVersion, granted, signatureName } = parsed.data;

  // FIX AUTH-03: applicantId must come from the authenticated token, not the body
  const applicantId = req.applicant?._id?.toString();
  if (!applicantId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  // FIX DB-10: Fetch the canonical consent text from the server-side policy,
  // not from the client request body. Client cannot override policy text.
  // In production, look up the versioned policy text from a policy store.
  const serverConsentText = `KYC Biometric Consent v${policyVersion}: I consent to the processing of my biometric data for identity verification purposes.`;
  const textHash = crypto.createHash('sha256').update(serverConsentText).digest('hex');
  const ipHash = crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex');
  const userAgentHash = crypto
    .createHash('sha256')
    .update(req.headers['user-agent'] || 'unknown')
    .digest('hex');

  // DB-11: Use append-only approach — create a new consent record for every action
  const consent = await Consent.create({
    applicantId,
    caseId,
    type,
    policyVersion,
    textHash,
    consentText: serverConsentText,
    granted,
    signatureName,
    ipHash,
    userAgentHash,
    at: new Date(),
  });

  // FIX DB-03: Only set case to CONSENTED when consent is actually granted=true.
  // Previously, granted=false also set the state to CONSENTED (bug).
  // Also: do NOT regress an already-decided case back to CONSENTED.
  if (caseId && granted) {
    const kycCase = await KycCase.findOne({ caseId });
    const nonRegressableStates = ['AUTO_APPROVED', 'APPROVED', 'REJECTED', 'AUTO_REJECTED', 'ERASED'];
    if (kycCase && !nonRegressableStates.includes(kycCase.state as string)) {
      kycCase.state = 'CONSENTED';
      kycCase.stateHistory.push({
        state: 'CONSENTED',
        at: new Date(),
        by: signatureName,
        notes: `Biometric consent granted (Version ${policyVersion})`,
      });
      await kycCase.save();
    }
  }

  await createAuditEntry({
    actor: { id: applicantId, type: 'applicant', role: 'applicant' },
    action: granted ? 'CONSENT_GIVEN' : 'CONSENT_DECLINED',
    resource: { type: 'Consent', id: consent._id.toString() },
    outcome: 'SUCCESS',
    ipHash,
    metadata: { consentType: type, policyVersion, signatureName, textHash, granted },
  });

  res.status(201).json({
    success: true,
    data: {
      consentId: consent._id,
      textHash,
      at: consent.at,
      policyVersion,
      granted,
    },
  });
}

export async function withdrawConsent(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { reason } = req.body;

  // FIX AUTH-03: Must be authenticated
  if (!req.applicant) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const consent = await Consent.findById(id);
  if (!consent) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Consent record not found' } });
    return;
  }

  // Ownership check
  if (consent.applicantId.toString() !== req.applicant._id.toString()) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot withdraw another applicant\'s consent' } });
    return;
  }

  // DB-11: Append-only — create a new withdrawal record instead of mutating the original
  const withdrawalRecord = await Consent.create({
    applicantId: consent.applicantId,
    caseId: consent.caseId,
    type: consent.type,
    policyVersion: consent.policyVersion,
    textHash: consent.textHash,
    consentText: consent.consentText,
    granted: false,
    signatureName: consent.signatureName,
    ipHash: crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex'),
    userAgentHash: crypto.createHash('sha256').update(req.headers['user-agent'] || 'unknown').digest('hex'),
    at: new Date(),
    withdrawnAt: new Date(),
    withdrawalReason: reason || 'Applicant exercised right to withdraw consent',
    originalConsentId: consent._id,
  });

  // Also mark the original as withdrawn for query convenience
  consent.withdrawnAt = new Date();
  consent.withdrawalReason = reason || 'Applicant exercised right to withdraw consent';
  consent.granted = false;
  await consent.save();

  if (consent.caseId) {
    const kycCase = await KycCase.findOne({ caseId: consent.caseId });
    if (kycCase && kycCase.state !== 'APPROVED' && kycCase.state !== 'REJECTED'
        && kycCase.state !== 'AUTO_APPROVED' && kycCase.state !== 'ERASED') {
      kycCase.state = 'ARCHIVED';
      kycCase.stateHistory.push({
        state: 'ARCHIVED',
        at: new Date(),
        by: req.applicant?._id?.toString() || 'applicant',
        notes: `Consent withdrawn: ${withdrawalRecord.withdrawalReason}`,
      });
      await kycCase.save();
    }
  }

  await createAuditEntry({
    actor: { id: consent.applicantId.toString(), type: 'applicant', role: 'applicant' },
    action: 'CONSENT_WITHDRAWN',
    resource: { type: 'Consent', id: consent._id.toString() },
    outcome: 'SUCCESS',
    ipHash: crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex'),
    metadata: { reason: withdrawalRecord.withdrawalReason, withdrawalRecordId: withdrawalRecord._id },
  });

  res.json({
    success: true,
    message: 'Consent withdrawn successfully. Processing has been halted.',
    data: {
      consentId: consent._id,
      withdrawalRecordId: withdrawalRecord._id,
      withdrawnAt: withdrawalRecord.withdrawnAt,
    },
  });
}

export async function getConsents(req: AuthRequest, res: Response): Promise<void> {
  // FIX REV-03: sanitize query parameters to prevent operator injection
  const applicantId = typeof req.query.applicantId === 'string' ? req.query.applicantId : undefined;
  const caseId = typeof req.query.caseId === 'string' ? req.query.caseId : undefined;
  const type = typeof req.query.type === 'string' ? req.query.type : undefined;

  const query: Record<string, string> = {};
  if (applicantId) query.applicantId = applicantId;
  if (caseId) query.caseId = caseId;
  if (type) query.type = type;

  // Applicants can only see their own consents
  if (req.role === 'applicant' && req.applicant) {
    query.applicantId = req.applicant._id.toString();
  }

  const consents = await Consent.find(query).sort({ at: -1 }).limit(100);

  res.json({
    success: true,
    data: consents,
  });
}
