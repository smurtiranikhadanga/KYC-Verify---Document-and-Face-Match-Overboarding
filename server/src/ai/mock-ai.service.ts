import {
  IAIService,
  AIAnalysisOutput,
  QualityResult,
  OCRResult,
  DocumentValidationResult,
  TamperResult,
  FaceVerificationResult,
  LivenessResult,
} from './ai.interface.js';
import { OcrService } from './ocr.service.js';
import { FaceService } from './face.service.js';
import { LivenessService } from './liveness.service.js';
import { TamperService } from './tamper.service.js';
import { DocumentValidationService } from './document-validation.service.js';
import { DecisionService, DecisionPolicy } from './decision.service.js';

export class MockAIService implements IAIService {
  private ocrService = new OcrService();
  private faceService = new FaceService();
  private livenessService = new LivenessService();
  private tamperService = new TamperService();
  private docValidationService = new DocumentValidationService();
  private decisionService = new DecisionService();

  async analyzeDocument(
    documentFrontBuffer: Buffer,
    documentBackBuffer?: Buffer,
    country = 'IN',
    docType = 'passport',
    caseId = 'demo-case'
  ): Promise<{
    quality: QualityResult;
    ocr: OCRResult;
    validation: DocumentValidationResult;
    tamper: TamperResult;
  }> {
    const quality = await this.docValidationService.evaluateQuality(documentFrontBuffer, caseId);
    const ocr = await this.ocrService.extractFields(
      documentFrontBuffer,
      documentBackBuffer,
      country,
      docType,
      caseId
    );
    const validation = this.docValidationService.validateDocument(
      ocr.fields.expiry.value,
      ocr.mrzValid,
      caseId
    );
    const tamper = await this.tamperService.detectTamper(documentFrontBuffer, caseId);

    return { quality, ocr, validation, tamper };
  }

  async verifyFaceAndLiveness(
    selfieBuffer: Buffer,
    documentFrontBuffer: Buffer,
    caseId = 'demo-case',
    activeChallenge: 'turn_left' | 'turn_right' | 'blink' | 'nod' | 'none' = 'none'
  ): Promise<{
    face: FaceVerificationResult;
    liveness: LivenessResult;
  }> {
    const face = await this.faceService.compareFaces(selfieBuffer, documentFrontBuffer, caseId);
    const liveness = await this.livenessService.evaluateLiveness(selfieBuffer, caseId, activeChallenge);

    return { face, liveness };
  }

  async runFullPipeline(
    caseId: string,
    country: string,
    docType: string,
    frontBuffer: Buffer,
    backBuffer: Buffer | undefined,
    selfieBuffer: Buffer,
    policyConfig?: DecisionPolicy
  ): Promise<AIAnalysisOutput> {
    const { quality, ocr, validation, tamper } = await this.analyzeDocument(
      frontBuffer,
      backBuffer,
      country,
      docType,
      caseId
    );

    const { face, liveness } = await this.verifyFaceAndLiveness(
      selfieBuffer,
      frontBuffer,
      caseId
    );

    const decisionResult = this.decisionService.evaluateDecision(
      quality,
      ocr,
      validation,
      face,
      liveness,
      tamper,
      policyConfig
    );

    return {
      quality,
      ocr,
      validation,
      face,
      liveness,
      tamper,
      riskScore: decisionResult.riskScore,
      riskFlags: decisionResult.riskFlags,
      decision: {
        outcome: decisionResult.outcome,
        reasonCodes: decisionResult.reasonCodes,
        priority: decisionResult.priority,
      },
    };
  }
}
