import axios from 'axios';
import FormData from 'form-data';
import { IAIService, AIAnalysisOutput, QualityResult, OCRResult, DocumentValidationResult, TamperResult, FaceVerificationResult, LivenessResult } from './ai.interface.js';
import { DecisionService, DecisionPolicy } from './decision.service.js';

export class FuturePythonAIService implements IAIService {
  private serviceUrl: string;
  private decisionService: DecisionService;

  constructor(serviceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000') {
    this.serviceUrl = serviceUrl;
    this.decisionService = new DecisionService();
  }

  async analyzeDocument(
    documentFrontBuffer: Buffer,
    documentBackBuffer?: Buffer,
    country?: string,
    docType?: string,
    caseId?: string
  ): Promise<{
    quality: QualityResult;
    ocr: OCRResult;
    validation: DocumentValidationResult;
    tamper: TamperResult;
  }> {
    throw new Error('Individual analyzeDocument not supported by current FastAPI interface. Use runFullPipeline.');
  }

  async verifyFaceAndLiveness(
    selfieBuffer: Buffer,
    documentFrontBuffer: Buffer,
    caseId?: string,
    activeChallenge?: string
  ): Promise<{
    face: FaceVerificationResult;
    liveness: LivenessResult;
  }> {
    throw new Error('Individual verifyFaceAndLiveness not supported by current FastAPI interface. Use runFullPipeline.');
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
    const form = new FormData();
    form.append('front', frontBuffer, 'front.jpg');
    form.append('selfie', selfieBuffer, 'selfie.jpg');
    if (backBuffer) {
      form.append('back', backBuffer, 'back.jpg');
    }
    
    form.append('meta', JSON.stringify({ country, docType, caseId }));

    try {
      const response = await axios.post(`${this.serviceUrl}/api/v1/analyze`, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      
      const data = response.data;
      
      const quality = data.document.quality;
      const ocr = data.document; // The python service returns fields inside document
      const validation = {
        expired: false,
        formatOk: data.document.mrz.valid,
        crossFieldOk: data.document.crossChecks.mrzVsViz,
        details: []
      };
      const face = data.face;
      const liveness = data.liveness;
      const tamper = data.tamper;

      const decisionResult = this.decisionService.evaluateDecision(
        quality,
        ocr,
        validation as any,
        face,
        liveness,
        tamper,
        policyConfig
      );

      return {
        quality,
        ocr,
        validation: validation as any,
        face,
        liveness,
        tamper,
        riskScore: decisionResult.riskScore,
        riskFlags: decisionResult.riskFlags,
        decision: {
          outcome: decisionResult.outcome,
          reasonCodes: decisionResult.reasonCodes,
          priority: decisionResult.priority
        }
      };
    } catch (err) {
      console.error(`Error calling Python AI Service:`, err);
      throw err;
    }
  }
}

