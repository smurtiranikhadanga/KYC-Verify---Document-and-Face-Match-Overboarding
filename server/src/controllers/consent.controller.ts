import { Request, Response } from 'express';
import crypto from 'crypto';
import { Consent } from '../models/consent.model.js';
import { KycCase } from '../models/case.model.js';
import { createAuditEntry } from '../models/audit-log.model.js';
import { ConsentSchema } from '../validators/index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export async function createConsent(req: Request, res: Response): Promise<void> {
  const parsed = ConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.format() } });
    return;
  }

  const { applicantId, caseId, type, policyVersion, granted, signatureName, consentText } = parsed.data;

  // Compute text hash and IP hash
  const textHash = crypto.createHash('sha256').update(consentText).digest('hex');
  const ipHash = crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex');
  const userAgentHash = crypto
    .createHash('sha256')
    .update(req.headers['user-agent'] || 'unknown')
    .digest('hex');

  const consent = await Consent.create({
    applicantId,
    caseId,
    type,
    policyVersion,
    textHash,
    consentText,
    granted,
    signatureName,
    ipHash,
    userAgentHash,
    at: new Date(),
  });

  if (caseId) {
    await KycCase.findOneAndUpdate(
      { caseId },
      {
        $addToSet: { consentIds: consent._id },
        state: 'CONSENTED',
        $push: {
          stateHistory: {
            state: 'CONSENTED',
            at: new Date(),
            by: signatureName,
            notes: `Biometric consent granted (Version ${policyVersion})`,
          },
        },
      }
    );
  }

  await createAuditEntry({
    actor: { id: applicantId, type: 'applicant', role: 'applicant' },
    action: 'CONSENT_GIVEN',
    resource: { type: 'Consent', id: consent._id.toString() },
    outcome: 'SUCCESS',
    ipHash,
    metadata: { consentType: type, policyVersion, signatureName, textHash },
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

  const consent = await Consent.findById(id);
  if (!consent) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Consent record not found' } });
    return;
  }

  consent.withdrawnAt = new Date();
  consent.withdrawalReason = reason || 'Applicant exercised right to withdraw consent';
  consent.granted = false;
  await consent.save();

  if (consent.caseId) {
    const kycCase = await KycCase.findOne({ caseId: consent.caseId });
    if (kycCase && kycCase.state !== 'APPROVED' && kycCase.state !== 'REJECTED') {
      kycCase.state = 'ARCHIVED';
      kycCase.stateHistory.push({
        state: 'ARCHIVED',
        at: new Date(),
        by: req.applicant?._id?.toString() || 'applicant',
        notes: `Consent withdrawn: ${consent.withdrawalReason}`,
      });
      await kycCase.save();
    }
  }

  await createAuditEntry({
    actor: { id: consent.applicantId.toString(), type: 'applicant', role: 'applicant' },
    action: 'CONSENT_WITHDRAWN',
    resource: { type: 'Consent', id: consent._id.toString() },
    outcome: 'SUCCESS',
    ipHash: req.ip || '127.0.0.1',
    metadata: { reason: consent.withdrawalReason },
  });

  res.json({
    success: true,
    message: 'Consent withdrawn successfully. Processing has been halted.',
    data: {
      consentId: consent._id,
      withdrawnAt: consent.withdrawnAt,
    },
  });
}

export async function getConsents(req: Request, res: Response): Promise<void> {
  const { applicantId, caseId, type } = req.query;
  const query: any = {};

  if (applicantId) query.applicantId = applicantId;
  if (caseId) query.caseId = caseId;
  if (type) query.type = type;

  const consents = await Consent.find(query).sort({ at: -1 }).limit(100);

  res.json({
    success: true,
    data: consents,
  });
}
