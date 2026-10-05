import fs from 'fs';
import { ProcessCaseJobData } from './queue.interface.js';
import { KycCase } from '../models/case.model.js';
import { Artifact } from '../models/artifact.model.js';
import { Policy } from '../models/policy.model.js';
import { ReviewTask } from '../models/review-task.model.js';
import { ModelRun } from '../models/model-run.model.js';
import { createAuditEntry } from '../models/audit-log.model.js';
import { getStorageProvider } from '../storage/index.js';
import { getAIService } from '../ai/index.js';

export async function processCaseJob(data: ProcessCaseJobData): Promise<void> {
  const { caseId } = data;
  console.log(`[JobQueue] Starting async processing for case: ${caseId}`);

  const kycCase = await KycCase.findOne({ caseId });
  if (!kycCase) {
    console.error(`[JobQueue] Case ${caseId} not found in database.`);
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

    // 1. Fetch artifacts
    const frontArtifact = await Artifact.findById(data.frontArtifactId);
    const selfieArtifact = await Artifact.findById(data.selfieArtifactId);
    const backArtifact = data.backArtifactId ? await Artifact.findById(data.backArtifactId) : null;

    if (!frontArtifact || !selfieArtifact) {
      throw new Error(`Required artifacts missing for case: ${caseId}`);
    }

    const frontPath = storage.getFilePath(frontArtifact.storageKey);
    const selfiePath = storage.getFilePath(selfieArtifact.storageKey);

    const frontBuffer = fs.existsSync(frontPath) ? await fs.promises.readFile(frontPath) : Buffer.from('front');
    const selfieBuffer = fs.existsSync(selfiePath) ? await fs.promises.readFile(selfiePath) : Buffer.from('selfie');
    let backBuffer: Buffer | undefined;
    if (backArtifact) {
      const backPath = storage.getFilePath(backArtifact.storageKey);
      if (fs.existsSync(backPath)) {
        backBuffer = await fs.promises.readFile(backPath);
      }
    }

    // 2. Fetch jurisdiction policy configuration
    const policy = (await Policy.findOne({ jurisdiction: kycCase.jurisdiction })) ||
      (await Policy.findOne({ jurisdiction: 'GLOBAL' })) || {
        faceMatchThreshold: 0.80,
        livenessThreshold: 0.85,
        tamperThreshold: 0.70,
        ocrConfidenceThreshold: 0.80,
        autoApproveAllowed: true,
      };

    // 3. Run AI Pipeline
    const aiOutput = await aiService.runFullPipeline(
      caseId,
      kycCase.jurisdiction,
      kycCase.documentType,
      frontBuffer,
      backBuffer,
      selfieBuffer,
      policy as any
    );

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
          fullNameConf: aiOutput.ocr.fields.fullName.confidence,
          idNumberConf: aiOutput.ocr.fields.idNumber.confidence,
          mrzValid: aiOutput.ocr.mrzValid,
        },
        timestamp: runTimestamp,
      },
      {
        runId: `run-face-${caseId}-${Date.now()}`,
        caseId,
        stage: 'FACE',
        modelName: aiOutput.face.model,
        modelVersion: '2.4.0',
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
        modelName: 'AntiSpoof-CNN',
        modelVersion: '1.8.0',
        latencyMs: aiOutput.liveness.latencyMs,
        inputStats: {},
        metrics: {
          score: aiOutput.liveness.score,
          passed: aiOutput.liveness.passed,
        },
        timestamp: runTimestamp,
      },
      {
        runId: `run-tamper-${caseId}-${Date.now()}`,
        caseId,
        stage: 'TAMPER',
        modelName: 'OpenCV-ELA-FFT',
        modelVersion: '1.2.0',
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

    // 5. Update case with embedded evaluation results
    kycCase.document.ocr = aiOutput.ocr as any;
    kycCase.document.validation = aiOutput.validation;
    kycCase.document.tamper = aiOutput.tamper;
    kycCase.document.quality = aiOutput.quality;
    kycCase.faceVerification = {
      ...aiOutput.face,
      selfieUrl: storage.getFileUrl(selfieArtifact.storageKey),
      croppedFaceUrl: storage.getFileUrl(frontArtifact.storageKey),
    };
    kycCase.liveness = aiOutput.liveness;
    kycCase.riskScore = aiOutput.riskScore;
    kycCase.riskFlags = aiOutput.riskFlags;

    const outcome = aiOutput.decision.outcome;
    kycCase.state = outcome as any;
    kycCase.stateHistory.push({
      state: outcome as any,
      at: new Date(),
      by: 'ai_decision_engine',
      notes: `Decision generated: ${outcome}. Reason codes: ${aiOutput.decision.reasonCodes.join(', ')}`,
    });

    kycCase.decision = {
      outcome,
      reasonCodes: aiOutput.decision.reasonCodes,
      policyVersion: (policy as any).version || 1,
      decidedBy: 'AI_DECISION_ENGINE',
      decidedAt: new Date(),
      priority: aiOutput.decision.priority,
    };

    await kycCase.save();

    // 6. If MANUAL_REVIEW, create a ReviewTask in the review queue
    if (outcome === 'MANUAL_REVIEW') {
      await ReviewTask.findOneAndUpdate(
        { caseId },
        {
          caseId,
          status: 'PENDING',
          priority: aiOutput.decision.priority,
          reasonCodes: aiOutput.decision.reasonCodes,
          slaDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours SLA
        },
        { upsert: true, new: true }
      );
    }

    // 7. Append immutable audit trail log
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

    console.log(`[JobQueue] Successfully finished processing case ${caseId} -> Result: ${outcome}`);
  } catch (error: any) {
    console.error(`[JobQueue] Case ${caseId} processing failed:`, error.message);
    kycCase.state = 'PROCESSING_FAILED';
    kycCase.stateHistory.push({
      state: 'PROCESSING_FAILED',
      at: new Date(),
      by: 'system_pipeline',
      notes: `Processing error: ${error.message}`,
    });
    await kycCase.save();

    await createAuditEntry({
      actor: { type: 'system', role: 'ai_pipeline' },
      action: 'CASE_PROCESSING_FAILED',
      resource: { type: 'KycCase', id: caseId },
      outcome: 'FAILURE',
      metadata: { error: error.message },
    });
  }
}
