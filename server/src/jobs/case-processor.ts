import fs from 'fs';
import { ProcessCaseJobData } from './queue.interface.js';
import { KycCase } from '../models/case.model.js';
import { Artifact } from '../models/artifact.model.js';
import { Policy } from '../models/policy.model.js';
import { Consent } from '../models/consent.model.js';
import { ReviewTask } from '../models/review-task.model.js';
import { ModelRun } from '../models/model-run.model.js';
import { createAuditEntry } from '../models/audit-log.model.js';
import { getStorageProvider } from '../storage/index.js';
import { getAIService } from '../ai/index.js';

// States that should NOT be overwritten by a running job (FIX PIPE-15)
const PROTECTED_STATES = new Set(['ERASED', 'ARCHIVED', 'APPROVED', 'AUTO_APPROVED']);

export async function processCaseJob(data: ProcessCaseJobData): Promise<void> {
  const { caseId } = data;
  console.log(`[JobQueue] Starting async processing for case: ${caseId}`);

  const kycCase = await KycCase.findOne({ caseId });
  if (!kycCase) {
    console.error(`[JobQueue] Case ${caseId} not found in database.`);
    return;
  }

  // FIX PIPE-15: Do not overwrite ERASED/ARCHIVED/APPROVED states
  if (PROTECTED_STATES.has(kycCase.state as string)) {
    console.warn(`[JobQueue] Case ${caseId} is in protected state '${kycCase.state}'. Aborting job.`);
    return;
  }

  // FIX PIPE-14: Check consent BEFORE processing begins
  const activeConsent = await Consent.findOne({
    caseId,
    type: 'biometric',
    granted: true,
    withdrawnAt: { $exists: false },
  });

  if (!activeConsent) {
    console.warn(`[JobQueue] Case ${caseId} has no active biometric consent. Aborting.`);
    kycCase.state = 'ARCHIVED';
    kycCase.stateHistory.push({
      state: 'ARCHIVED',
      at: new Date(),
      by: 'system_pipeline',
      notes: 'Processing aborted: no valid biometric consent',
    });
    await kycCase.save();
    return;
  }

  // Update state to PROCESSING
  kycCase.state = 'PROCESSING';
  kycCase.stateHistory.push({
    state: 'PROCESSING',
    at: new Date(),
    by: 'system_pipeline',
    notes: 'Async AI evaluation pipeline started',
  });
  await kycCase.save();

  try {
    const storage = getStorageProvider();
    const aiService = getAIService();

    // 1. Fetch artifacts by explicit ID (provided by submitCase from latest artifacts)
    const frontArtifact = await Artifact.findById(data.frontArtifactId);
    const selfieArtifact = await Artifact.findById(data.selfieArtifactId);
    const backArtifact = data.backArtifactId ? await Artifact.findById(data.backArtifactId) : null;

    if (!frontArtifact || !selfieArtifact) {
      throw new Error(`Required artifacts missing for case: ${caseId}`);
    }

    const frontPath = storage.getFilePath(frontArtifact.storageKey);
    const selfiePath = storage.getFilePath(selfieArtifact.storageKey);

    // FIX PIPE-12: Fail clearly when files are missing, instead of using Buffer.from('front')
    if (!fs.existsSync(frontPath)) {
      throw new Error(`Front document file not found on disk: ${frontPath}`);
    }
    if (!fs.existsSync(selfiePath)) {
      throw new Error(`Selfie file not found on disk: ${selfiePath}`);
    }

    const frontBuffer = await fs.promises.readFile(frontPath);
    const selfieBuffer = await fs.promises.readFile(selfiePath);
    let backBuffer: Buffer | undefined;
    if (backArtifact) {
      const backPath = storage.getFilePath(backArtifact.storageKey);
      if (fs.existsSync(backPath)) {
        backBuffer = await fs.promises.readFile(backPath);
      }
    }

    // FIX PIPE-14: Re-check consent right before AI processing (withdrawal may have
    // occurred between queue enqueue and processing)
    const consentCheck = await Consent.findOne({
      caseId,
      type: 'biometric',
      granted: true,
      withdrawnAt: { $exists: false },
    });

    if (!consentCheck) {
      console.warn(`[JobQueue] Consent withdrawn before processing started for case ${caseId}. Aborting.`);
      // FIX PIPE-15: Check current state before overwriting
      const freshCase = await KycCase.findOne({ caseId });
      if (freshCase && !PROTECTED_STATES.has(freshCase.state as string)) {
        freshCase.state = 'ARCHIVED';
        freshCase.stateHistory.push({
          state: 'ARCHIVED',
          at: new Date(),
          by: 'system_pipeline',
          notes: 'Processing aborted mid-flight: consent withdrawn',
        });
        await freshCase.save();
      }
      return;
    }

    // FIX PIPE-13: Policy lookup uses riskTier and returns the active/versioned policy
    // Sort by version descending so the highest version wins
    const policy = await Policy.findOne({
      jurisdiction: kycCase.jurisdiction,
      riskTier: kycCase.riskTier || 'standard',
    }).sort({ version: -1 })
      || await Policy.findOne({ jurisdiction: kycCase.jurisdiction }).sort({ version: -1 })
      || await Policy.findOne({ jurisdiction: 'GLOBAL' }).sort({ version: -1 })
      || {
        faceMatchThreshold: 0.55,
        livenessThreshold: 0.60,
        tamperThreshold: 0.55,
        ocrConfidenceThreshold: 0.80,
        autoApproveAllowed: true,
        minimumAgeYears: 18,
        version: 1,
      };

    // 3. Run AI Pipeline
    const aiOutput = await (aiService as any).runFullPipeline(
      caseId,
      kycCase.jurisdiction,
      kycCase.documentType,
      frontBuffer,
      backBuffer,
      selfieBuffer,
      policy as any
    );

    // FIX PIPE-15: Re-fetch case to check for state changes during processing
    const freshCase = await KycCase.findOne({ caseId });
    if (!freshCase) {
      console.warn(`[JobQueue] Case ${caseId} disappeared during processing.`);
      return;
    }
    if (PROTECTED_STATES.has(freshCase.state as string)) {
      console.warn(`[JobQueue] Case ${caseId} moved to protected state '${freshCase.state}' during processing. Aborting.`);
      return;
    }

    // 4. Record ModelRuns for MLOps tracking
    const runTimestamp = new Date();
    await ModelRun.create([
      {
        runId: `run-ocr-${caseId}-${Date.now()}`,
        caseId,
        stage: 'OCR',
        modelName: aiOutput.ocr.engine,
        modelVersion: aiOutput.ocr.version,
        latencyMs: aiOutput.ocr.latencyMs,
        inputStats: { blur: aiOutput.quality.blur, glare: aiOutput.quality.glare },
        metrics: {
          fullNameConf: aiOutput.ocr.fields.fullName?.confidence,
          idNumberConf: aiOutput.ocr.fields.idNumber?.confidence,
          mrzValid: aiOutput.ocr.mrzValid,
        },
        timestamp: runTimestamp,
      },
      {
        runId: `run-face-${caseId}-${Date.now()}`,
        caseId,
        stage: 'FACE',
        modelName: aiOutput.face.model,
        modelVersion: '1.0.0',
        latencyMs: aiOutput.face.latencyMs,
        inputStats: {},
        metrics: {
          similarity: aiOutput.face.similarity,
          distance: aiOutput.face.distance,
          match: aiOutput.face.match,
        },
        timestamp: runTimestamp,
      },
      {
        runId: `run-live-${caseId}-${Date.now()}`,
        caseId,
        stage: 'LIVENESS',
        modelName: 'HeuristicLiveness-v1',
        modelVersion: '1.0.0',
        latencyMs: aiOutput.liveness.latencyMs,
        inputStats: {},
        metrics: {
          score: aiOutput.liveness.score,
          passed: aiOutput.liveness.passed,
          method: aiOutput.liveness.method,
        },
        timestamp: runTimestamp,
      },
      {
        runId: `run-tamper-${caseId}-${Date.now()}`,
        caseId,
        stage: 'TAMPER',
        modelName: 'OpenCV-ELA-BlockVar',
        modelVersion: '1.3.0',
        latencyMs: aiOutput.tamper.latencyMs,
        inputStats: {},
        metrics: {
          score: aiOutput.tamper.score,
          ela: aiOutput.tamper.ela,
          fft: aiOutput.tamper.fft,
        },
        timestamp: runTimestamp,
      },
    ]);

    // 5. Update case with evaluation results using freshCase to avoid overwriting recent changes
    freshCase.document.ocr = aiOutput.ocr as any;
    freshCase.document.validation = aiOutput.validation;
    freshCase.document.tamper = aiOutput.tamper;
    freshCase.document.quality = aiOutput.quality;
    freshCase.faceVerification = {
      ...aiOutput.face,
      selfieUrl: storage.getFileUrl(selfieArtifact.storageKey),
      // FIX PIPE-01: croppedFaceUrl is the ID front (honest about what it is)
      // In production this should be the actually cropped face region from the ID
      croppedFaceUrl: storage.getFileUrl(frontArtifact.storageKey),
    };
    freshCase.liveness = aiOutput.liveness;
    freshCase.riskScore = aiOutput.riskScore;
    freshCase.riskFlags = aiOutput.riskFlags;

    const outcome = aiOutput.decision.outcome;
    freshCase.state = outcome as any;
    freshCase.stateHistory.push({
      state: outcome as any,
      at: new Date(),
      by: 'ai_decision_engine',
      notes: `Decision: ${outcome}. Reasons: ${aiOutput.decision.reasonCodes.join(', ')}`,
    });

    freshCase.decision = {
      outcome,
      reasonCodes: aiOutput.decision.reasonCodes,
      policyVersion: (policy as any).version || 1,
      decidedBy: 'AI_DECISION_ENGINE',
      decidedAt: new Date(),
      priority: aiOutput.decision.priority,
    };

    await freshCase.save();

    // 6. If MANUAL_REVIEW, create a ReviewTask
    if (outcome === 'MANUAL_REVIEW') {
      await ReviewTask.findOneAndUpdate(
        { caseId },
        {
          caseId,
          status: 'PENDING',
          priority: aiOutput.decision.priority,
          reasonCodes: aiOutput.decision.reasonCodes,
          slaDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
        { upsert: true, new: true }
      );
    }

    // 7. Audit trail
    await createAuditEntry({
      actor: { type: 'system', role: 'ai_pipeline' },
      action: 'CASE_PROCESSED',
      resource: { type: 'KycCase', id: caseId },
      outcome: 'SUCCESS',
      metadata: {
        outcome,
        riskScore: aiOutput.riskScore,
        riskFlags: aiOutput.riskFlags,
        reasonCodes: aiOutput.decision.reasonCodes,
      },
    });

    console.log(`[JobQueue] Finished processing case ${caseId} -> Result: ${outcome}`);
  } catch (error: any) {
    console.error(`[JobQueue] Case ${caseId} processing failed:`, error.message);

    // FIX PIPE-15: Re-fetch to avoid overwriting a protected state
    const freshCase = await KycCase.findOne({ caseId });
    if (freshCase && !PROTECTED_STATES.has(freshCase.state as string)) {
      freshCase.state = 'PROCESSING_FAILED';
      freshCase.stateHistory.push({
        state: 'PROCESSING_FAILED',
        at: new Date(),
        by: 'system_pipeline',
        notes: `Processing error: ${error.message}`,
      });
      await freshCase.save();
    }

    await createAuditEntry({
      actor: { type: 'system', role: 'ai_pipeline' },
      action: 'CASE_PROCESSING_FAILED',
      resource: { type: 'KycCase', id: caseId },
      outcome: 'FAILURE',
      metadata: { error: error.message },
    });
  }
}
