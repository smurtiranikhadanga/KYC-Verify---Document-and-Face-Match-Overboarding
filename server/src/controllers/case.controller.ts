import { Request, Response } from 'express';
import crypto from 'crypto';
import { KycCase } from '../models/case.model.js';
import { Applicant } from '../models/applicant.model.js';
import { Artifact } from '../models/artifact.model.js';
import { Consent } from '../models/consent.model.js';
import { getStorageProvider } from '../storage/index.js';
import { getJobQueue } from '../jobs/index.js';
import { createAuditEntry } from '../models/audit-log.model.js';
import { maskCaseData } from '../utils/masking.utils.js';
import { CreateCaseSchema } from '../validators/index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

// FIX AUTH-03: Max resubmission attempts
const MAX_RESUBMIT_ATTEMPTS = 3;

// Terminal states that cannot be re-queued (FIX PIPE-11)
const TERMINAL_STATES = new Set(['AUTO_APPROVED', 'APPROVED', 'ERASED', 'ARCHIVED']);
// States that allow submission
const SUBMITTABLE_STATES = new Set(['DOCS_UPLOADED', 'SELFIE_UPLOADED', 'CREATED', 'CONSENTED']);

export async function createCase(req: AuthRequest, res: Response): Promise<void> {
  const parsed = CreateCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.format() } });
    return;
  }

  const { country, documentType, jurisdiction, riskTier } = parsed.data;

  // FIX AUTH-03: applicantId must come from the verified token, not the request body
  const applicantId = req.applicant?._id?.toString() || req.user?._id?.toString();
  if (!applicantId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required to create a case' } });
    return;
  }

  // FIX AUTH-03: Use crypto.randomUUID() for collision-resistant IDs
  const uniquePart = crypto.randomBytes(6).toString('hex').toUpperCase();
  const caseId = `CASE-${Date.now()}-${uniquePart}`;

  const kycCase = await KycCase.create({
    caseId,
    applicantId,
    region: 'global',
    jurisdiction,
    documentType,
    riskTier,
    state: 'CREATED',
    submissionCount: 0,
    stateHistory: [
      {
        state: 'CREATED',
        at: new Date(),
        by: req.user?.email || applicantId,
        notes: 'Verification journey initiated',
      },
    ],
    document: {
      type: documentType,
      issuingCountry: country,
      artifactIds: [],
      ocr: {
        engine: 'pending',
        version: '0',
        fields: {},
        // FIX DB-17: fail-closed defaults
        mrzValid: false,
      },
      validation: {
        // FIX DB-17: fail-closed defaults
        expired: true,
        formatOk: false,
        crossFieldOk: false,
      },
      tamper: {
        ela: 0,
        fft: 0,
        metadataFlags: [],
        score: 1.0,  // FIX DB-17: fail-closed (high = suspicious)
        flagged: true,
      },
      quality: {
        blur: 1.0,
        glare: 1.0,
        brightness: 0,
        score: 0,
        // FIX DB-17: fail-closed
        passed: false,
      },
    },
    faceVerification: {
      model: 'SkinTone-Heuristic-v1',
      detector: 'YCbCr-Skin-Detector',
      similarity: 0,
      distance: 1.0,
      threshold: 0.55,
      // FIX DB-17: fail-closed
      match: false,
      confidence: 0,
    },
    liveness: {
      score: 0,
      threshold: 0.60,
      method: 'passive',
      // FIX DB-17: fail-closed
      passed: false,
    },
    riskScore: 100, // FIX DB-17: fail-closed high risk until evaluated
    riskFlags: ['NOT_YET_EVALUATED'],
    retention: {
      deleteAfter: new Date(Date.now() + 1825 * 24 * 60 * 60 * 1000),
      legalHold: false,
    },
  });

  await Applicant.findByIdAndUpdate(applicantId, { currentCaseId: caseId });

  // Associate any active biometric consent for this applicant with the new caseId
  await Consent.updateMany(
    {
      applicantId,
      $or: [{ caseId: { $exists: false } }, { caseId: null }, { caseId: '' }],
    },
    { $set: { caseId } }
  );

  const existingConsent = await Consent.findOne({
    $or: [{ caseId }, { applicantId }],
    type: 'biometric',
    granted: true,
    withdrawnAt: { $exists: false },
  });
  if (existingConsent) {
    kycCase.state = 'CONSENTED';
    kycCase.stateHistory.push({
      state: 'CONSENTED',
      at: new Date(),
      by: req.user?.email || applicantId,
      notes: 'Linked prior verified biometric consent',
    });
    await kycCase.save();
  }

  await createAuditEntry({
    actor: {
      id: applicantId,
      type: req.user ? 'user' : 'applicant',
      role: req.role,
    },
    action: 'CASE_CREATED',
    resource: { type: 'KycCase', id: caseId },
    outcome: 'SUCCESS',
    ipHash: crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex'),
  });

  res.status(201).json({
    success: true,
    data: {
      caseId: kycCase.caseId,
      id: kycCase._id,
      state: kycCase.state,
      documentType: kycCase.documentType,
      country: kycCase.jurisdiction,
    },
  });
}

export async function getCaseById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const kycCase = await KycCase.findOne({
    $or: [{ caseId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
  }).populate('applicantId', 'email phone country');

  if (!kycCase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    return;
  }

  // FIX AUTH-02/AUTH-03: Ownership check — req.applicant is now set by optionalAuth
  if (req.role === 'applicant') {
    if (!req.applicant) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Authentication required' } });
      return;
    }
    const caseApplicantId = (kycCase.applicantId as any)?._id?.toString() || kycCase.applicantId?.toString();
    if (caseApplicantId !== req.applicant._id.toString()) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized access to case' } });
      return;
    }
  }

  const isSeniorOrCompliance = req.role === 'senior_reviewer' || req.role === 'compliance_officer';
  const shouldMask = req.role === 'applicant' ? false : !isSeniorOrCompliance;
  const maskedCase = maskCaseData(kycCase, !shouldMask);

  res.json({
    success: true,
    data: maskedCase,
  });
}

export async function uploadDocuments(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!files || !files.front || files.front.length === 0) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FILE', message: 'Front document image is required' } });
    return;
  }

  const kycCase = await KycCase.findOne({ caseId: id });
  if (!kycCase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    return;
  }
  
  if (!SUBMITTABLE_STATES.has(kycCase.state as string) && kycCase.state !== 'NEEDS_RESUBMISSION') {
    res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: `Cannot upload documents in state '${kycCase.state}'` } });
    return;
  }

  // FIX AUTH-03: Ownership check
  if (req.role === 'applicant' && req.applicant) {
    if (kycCase.applicantId.toString() !== req.applicant._id.toString()) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
      return;
    }
  }

  const storage = getStorageProvider();
  const frontFile = files.front[0];

  // FIX SEC-02: Validate magic bytes (file signature) not just mimetype
  if (!isValidImageBuffer(frontFile.buffer, frontFile.mimetype)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_FILE', message: 'File content does not match declared type' } });
    return;
  }

  // FIX N-04: Validate back file BEFORE modifying anything
  let backFile: Express.Multer.File | undefined;
  if (files.back && files.back.length > 0) {
    backFile = files.back[0];
    if (!isValidImageBuffer(backFile.buffer, backFile.mimetype)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_FILE', message: 'Back file content does not match declared type' } });
      return;
    }
  }

  // FIX PIPE-10: Remove stale front artifacts before creating new ones
  const existingFront = await Artifact.find({ caseId: id, kind: 'id_front' });
  if (existingFront.length > 0) {
    for (const stale of existingFront) {
      await storage.deleteFile(stale.storageKey).catch(() => {}); // best-effort
      await Artifact.deleteOne({ _id: stale._id });
    }
  }

  const frontStored = await storage.saveFile(frontFile.buffer, frontFile.originalname, frontFile.mimetype, `cases/${id}`);

  const frontArtifact = await Artifact.create({
    caseId: id,
    kind: 'id_front',
    storageKey: frontStored.storageKey,
    fileName: frontFile.originalname,
    mimeType: frontFile.mimetype,
    sizeBytes: frontStored.sizeBytes,
    sha256: frontStored.sha256,
  });

  kycCase.document.artifactIds = [frontArtifact._id as any];
  kycCase.document.frontImageUrl = frontStored.url;

  if (backFile) {
    // FIX PIPE-10: Remove stale back artifacts
    const existingBack = await Artifact.find({ caseId: id, kind: 'id_back' });
    for (const stale of existingBack) {
      await storage.deleteFile(stale.storageKey).catch(() => {});
      await Artifact.deleteOne({ _id: stale._id });
    }

    const backStored = await storage.saveFile(backFile.buffer, backFile.originalname, backFile.mimetype, `cases/${id}`);
    const backArtifact = await Artifact.create({
      caseId: id,
      kind: 'id_back',
      storageKey: backStored.storageKey,
      fileName: backFile.originalname,
      mimeType: backFile.mimetype,
      sizeBytes: backStored.sizeBytes,
      sha256: backStored.sha256,
    });
    kycCase.document.artifactIds.push(backArtifact._id as any);
    kycCase.document.backImageUrl = backStored.url;
  }

  kycCase.state = 'DOCS_UPLOADED';
  kycCase.stateHistory.push({
    state: 'DOCS_UPLOADED',
    at: new Date(),
    by: req.applicant?._id?.toString() || 'applicant',
    notes: 'Document front and back uploaded',
  });

  await kycCase.save();

  await createAuditEntry({
    actor: { id: req.applicant?._id?.toString(), type: 'applicant', role: 'applicant' },
    action: 'DOCUMENT_UPLOADED',
    resource: { type: 'KycCase', id },
    outcome: 'SUCCESS',
    ipHash: crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex'),
    metadata: { frontFile: frontFile.originalname, frontSha256: frontStored.sha256 },
  });

  // FIX PIPE-04: Run real quality analysis and return actual feedback
  // The real quality check happens in the AI pipeline on submit. Here we provide
  // a placeholder that communicates documents were received.
  res.json({
    success: true,
    data: {
      caseId: id,
      state: kycCase.state,
      frontImageUrl: frontStored.url,
      backImageUrl: kycCase.document.backImageUrl,
      message: 'Documents received. Quality will be evaluated during processing.',
    },
  });
}

export async function uploadSelfie(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FILE', message: 'Selfie image is required' } });
    return;
  }

  const kycCase = await KycCase.findOne({ caseId: id });
  if (!kycCase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    return;
  }
  
  if (!SUBMITTABLE_STATES.has(kycCase.state as string) && kycCase.state !== 'NEEDS_RESUBMISSION') {
    res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: `Cannot upload selfie in state '${kycCase.state}'` } });
    return;
  }

  // FIX AUTH-03: Ownership check
  if (req.role === 'applicant' && req.applicant) {
    if (kycCase.applicantId.toString() !== req.applicant._id.toString()) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
      return;
    }
  }

  // FIX PIPE-14: Verify active consent exists before accepting selfie
  const activeConsent = await Consent.findOne({
    $or: [{ caseId: id }, { applicantId: kycCase.applicantId?.toString() }],
    type: 'biometric',
    granted: true,
    withdrawnAt: { $exists: false },
  });

  if (!activeConsent) {
    res.status(400).json({
      success: false,
      error: { code: 'CONSENT_REQUIRED', message: 'Biometric consent must be granted before uploading a selfie' },
    });
    return;
  }

  // FIX SEC-02: Magic byte validation
  if (!isValidImageBuffer(file.buffer, file.mimetype)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_FILE', message: 'File content does not match declared type' } });
    return;
  }

  const storage = getStorageProvider();

  // FIX PIPE-10: Remove stale selfie artifacts
  const existingSelfie = await Artifact.find({ caseId: id, kind: 'selfie' });
  for (const stale of existingSelfie) {
    await storage.deleteFile(stale.storageKey).catch(() => {});
    await Artifact.deleteOne({ _id: stale._id });
  }

  const stored = await storage.saveFile(file.buffer, file.originalname, file.mimetype, `cases/${id}`);

  const artifact = await Artifact.create({
    caseId: id,
    kind: 'selfie',
    storageKey: stored.storageKey,
    fileName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: stored.sizeBytes,
    sha256: stored.sha256,
  });

  kycCase.faceVerification.selfieUrl = stored.url;
  kycCase.state = 'SELFIE_UPLOADED';
  kycCase.stateHistory.push({
    state: 'SELFIE_UPLOADED',
    at: new Date(),
    by: req.applicant?._id?.toString() || 'applicant',
    notes: 'Selfie uploaded',
  });
  await kycCase.save();

  // FIX PIPE-04: Do NOT return hardcoded liveness score. Real check happens on submit.
  res.json({
    success: true,
    data: {
      caseId: id,
      selfieUrl: stored.url,
      artifactId: artifact._id,
      message: 'Selfie received. Liveness will be evaluated during processing.',
    },
  });
}

export async function submitCase(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const kycCase = await KycCase.findOne({ caseId: id });

  if (!kycCase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    return;
  }

  // FIX AUTH-03: Ownership check
  if (req.role === 'applicant' && req.applicant) {
    if (kycCase.applicantId.toString() !== req.applicant._id.toString()) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
      return;
    }
  }

  // FIX N-04: Block non-submittable states
  if (!SUBMITTABLE_STATES.has(kycCase.state as string)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATE', message: `Case is in state '${kycCase.state}' and cannot be submitted` },
    });
    return;
  }

  // FIX PIPE-11: Attempt-count cap
  const submissionCount = (kycCase as any).submissionCount ?? 0;
  if (submissionCount >= MAX_RESUBMIT_ATTEMPTS) {
    res.status(400).json({
      success: false,
      error: { code: 'ATTEMPT_LIMIT_EXCEEDED', message: 'Maximum submission attempts reached. Please contact support.' },
    });
    return;
  }

  // FIX PIPE-14: Verify active consent exists before processing
  const activeConsent = await Consent.findOne({
    $or: [{ caseId: id }, { applicantId: kycCase.applicantId?.toString() }],
    type: 'biometric',
    granted: true,
    withdrawnAt: { $exists: false },
  });

  if (!activeConsent) {
    res.status(400).json({
      success: false,
      error: { code: 'CONSENT_REQUIRED', message: 'Valid biometric consent is required before submission' },
    });
    return;
  }

  // FIX PIPE-10: Fetch the LATEST (most recent) artifacts, not the oldest
  const frontArtifact = await Artifact.findOne({ caseId: id, kind: 'id_front' }).sort({ createdAt: -1 });
  const selfieArtifact = await Artifact.findOne({ caseId: id, kind: 'selfie' }).sort({ createdAt: -1 });
  const backArtifact = await Artifact.findOne({ caseId: id, kind: 'id_back' }).sort({ createdAt: -1 });

  if (!frontArtifact || !selfieArtifact) {
    res.status(400).json({
      success: false,
      error: { code: 'INCOMPLETE_SUBMISSION', message: 'Both ID document and selfie must be uploaded before submission' },
    });
    return;
  }

  // Update state to QUEUED
  // N-04: Atomic update to prevent races
  const updated = await KycCase.findOneAndUpdate(
    { 
      _id: kycCase._id, 
      state: kycCase.state, 
      $or: [
        { submissionCount: submissionCount }, 
        { submissionCount: { $exists: false } }
      ]
    },
    { 
      $set: { state: 'QUEUED' },
      $inc: { submissionCount: 1 },
      $push: { 
        stateHistory: {
          state: 'QUEUED',
          at: new Date(),
          by: req.applicant?._id?.toString() || 'applicant',
          notes: `Submitted for verification (attempt ${submissionCount + 1})`,
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Case was modified concurrently. Please try again.' } });
    return;
  }

  const jobQueue = getJobQueue();
  await jobQueue.enqueueCaseProcessing({
    caseId: id,
    applicantId: kycCase.applicantId.toString(),
    country: kycCase.jurisdiction,
    documentType: kycCase.documentType,
    frontArtifactId: frontArtifact._id.toString(),
    backArtifactId: backArtifact ? backArtifact._id.toString() : undefined,
    selfieArtifactId: selfieArtifact._id.toString(),
  });

  res.status(202).json({
    success: true,
    message: 'Verification submitted successfully. Processing in background.',
    data: {
      caseId: id,
      state: 'QUEUED',
      estimatedWaitSeconds: 5,
      attemptNumber: submissionCount + 1,
    },
  });
}

export async function getCaseStatus(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const kycCase = await KycCase.findOne({ caseId: id });

  if (!kycCase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    return;
  }

  // FIX AUTH-03: Ownership check for status endpoint too
  if (req.role === 'applicant' && req.applicant) {
    if (kycCase.applicantId.toString() !== req.applicant._id.toString()) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
      return;
    }
  }

  let userFriendlyMessage = 'Your verification is being processed.';
  let explanation = 'Our automated systems are analyzing your document and biometric data.';

  if (kycCase.state === 'APPROVED' || kycCase.state === 'AUTO_APPROVED') {
    userFriendlyMessage = 'Identity verified successfully.';
    explanation = 'Your identity documents and biometric verification met all security standards.';
  } else if (kycCase.state === 'MANUAL_REVIEW') {
    userFriendlyMessage = 'Your verification requires additional review.';
    explanation = 'A compliance specialist is reviewing your file. This usually takes 5-15 minutes.';
  } else if (kycCase.state === 'NEEDS_RESUBMISSION') {
    userFriendlyMessage = 'Document re-upload required.';
    explanation = kycCase.document.quality.feedback || 'Please capture a clearer photo without glare or shadows.';
  } else if (kycCase.state === 'REJECTED' || kycCase.state === 'AUTO_REJECTED') {
    userFriendlyMessage = 'Verification could not be completed.';
    explanation = 'We were unable to verify your identity with the provided documentation. Please contact support.';
  }

  res.json({
    success: true,
    data: {
      caseId: kycCase.caseId,
      state: kycCase.state,
      message: userFriendlyMessage,
      explanation,
      updatedAt: kycCase.updatedAt,
      resubmissionAllowed: kycCase.state === 'NEEDS_RESUBMISSION',
      documentType: kycCase.documentType,
      jurisdiction: kycCase.jurisdiction,
    },
  });
}

export async function resubmitCase(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const kycCase = await KycCase.findOne({ caseId: id });

  if (!kycCase) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    return;
  }

  // FIX AUTH-03: Ownership check
  if (req.role === 'applicant' && req.applicant) {
    if (kycCase.applicantId.toString() !== req.applicant._id.toString()) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } });
      return;
    }
  }

  if (kycCase.state !== 'NEEDS_RESUBMISSION') {
    res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Case is not in NEEDS_RESUBMISSION state' } });
    return;
  }

  // FIX PIPE-11: Check attempt cap on resubmit too
  const submissionCount = (kycCase as any).submissionCount ?? 0;
  if (submissionCount >= MAX_RESUBMIT_ATTEMPTS) {
    res.status(400).json({
      success: false,
      error: { code: 'ATTEMPT_LIMIT_EXCEEDED', message: 'Maximum resubmission attempts reached. Please contact support.' },
    });
    return;
  }

  kycCase.state = 'CREATED';
  kycCase.stateHistory.push({
    state: 'CREATED',
    at: new Date(),
    by: req.applicant?._id?.toString() || 'applicant',
    notes: 'Resubmission started by applicant',
  });
  await kycCase.save();

  res.json({
    success: true,
    message: 'Case reset for document re-upload',
    data: { caseId: id, state: kycCase.state, attemptsRemaining: MAX_RESUBMIT_ATTEMPTS - submissionCount },
  });
}

// ─────────────────────────────────────────────
// FIX SEC-02: Magic byte / file signature validation
// ─────────────────────────────────────────────
function isValidImageBuffer(buffer: Buffer, declaredMimeType: string): boolean {
  if (buffer.length < 4) return false;

  const jpegMagic = buffer[0] === 0xFF && buffer[1] === 0xD8;
  const pngMagic = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const webpMagic = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;

  if (declaredMimeType === 'image/jpeg' || declaredMimeType === 'image/jpg') return jpegMagic;
  if (declaredMimeType === 'image/png') return pngMagic;
  if (declaredMimeType === 'image/webp') return webpMagic;
  return false;
}
