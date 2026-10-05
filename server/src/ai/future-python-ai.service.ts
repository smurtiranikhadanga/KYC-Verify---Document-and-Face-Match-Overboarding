import { IAIService, AIAnalysisOutput, QualityResult, OCRResult, DocumentValidationResult, TamperResult, FaceVerificationResult, LivenessResult } from './ai.interface.js';
import { DecisionPolicy } from './decision.service.js';

/**
 * FuturePythonAIService
 * Prepared architecture stub for HTTP / gRPC / RabbitMQ integration
 * with the dedicated Python FastAPI microservice (PaddleOCR, DeepFace, OpenCV ELA).
 */
export class FuturePythonAIService implements IAIService {
  private serviceUrl: string;

  constructor(serviceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000') {
    this.serviceUrl = serviceUrl;
  }

  async analyzeDocument(
    _documentFrontBuffer: Buffer,
    _documentBackBuffer?: Buffer,
    _country?: string,
    _docType?: string,
    _caseId?: string
  ): Promise<{
    quality: QualityResult;
    ocr: OCRResult;
    validation: DocumentValidationResult;
    tamper: TamperResult;
  }> {
    throw new Error(`FuturePythonAIService connected to ${this.serviceUrl} is not yet enabled for local testing.`);
  }

  async verifyFaceAndLiveness(
    _selfieBuffer: Buffer,
    _documentFrontBuffer: Buffer,
    _caseId?: string,
    _activeChallenge?: string
  ): Promise<{
    face: FaceVerificationResult;
    liveness: LivenessResult;
  }> {
    throw new Error(`FuturePythonAIService connected to ${this.serviceUrl} is not yet enabled for local testing.`);
  }

  async runFullPipeline(
    _caseId: string,
    _country: string,
    _docType: string,
    _frontBuffer: Buffer,
    _backBuffer: Buffer | undefined,
    _selfieBuffer: Buffer,
    _policyConfig?: DecisionPolicy
  ): Promise<AIAnalysisOutput> {
    throw new Error(`FuturePythonAIService connected to ${this.serviceUrl} is not yet enabled for local testing.`);
  }
}
