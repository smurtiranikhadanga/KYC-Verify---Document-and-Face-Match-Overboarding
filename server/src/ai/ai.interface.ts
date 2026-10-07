export interface OCRResult {
  engine: string;
  version: string;
  fields: {
    fullName: { value: string; confidence: number; box?: [number, number, number, number] };
    dob: { value: string; confidence: number; box?: [number, number, number, number] };
    idNumber: { value: string; confidence: number; box?: [number, number, number, number] };
    expiry: { value: string; confidence: number; box?: [number, number, number, number] };
    address?: { value: string; confidence: number; box?: [number, number, number, number] };
  };
  mrzValid: boolean;
  rawText?: string;
  latencyMs: number;
}

export interface FaceVerificationResult {
  model: string;
  detector: string;
  similarity: number;
  distance: number;
  threshold: number;
  match: boolean;
  confidence: number;
  latencyMs: number;
  error?: string;
  verdict?: 'COMPLETELY_MATCHING' | 'NOT_MATCHING' | 'NO_FACE_IN_DOCUMENT' | 'NO_FACE_IN_SELFIE';
  feedback?: string;
}

export interface LivenessResult {
  score: number;
  threshold: number;
  method: 'passive' | 'active' | 'hybrid';
  passed: boolean;
  challengeType?: 'turn_left' | 'turn_right' | 'blink' | 'nod' | 'none';
  challengeResult?: boolean;
  latencyMs: number;
}

export interface TamperResult {
  ela: number;
  fft: number;
  score: number;
  flagged: boolean;
  metadataFlags: string[];
  latencyMs: number;
}

export interface DocumentValidationResult {
  expired: boolean;
  formatOk: boolean;
  crossFieldOk: boolean;
  details: string[];
}

export interface QualityResult {
  blur: number;
  glare: number;
  brightness: number;
  score: number;
  passed: boolean;
  feedback?: string;
}

export interface AIAnalysisOutput {
  quality: QualityResult;
  ocr: OCRResult;
  validation: DocumentValidationResult;
  face: FaceVerificationResult;
  liveness: LivenessResult;
  tamper: TamperResult;
  riskScore: number;
  riskFlags: string[];
  decision: {
    outcome: 'AUTO_APPROVED' | 'MANUAL_REVIEW' | 'AUTO_REJECTED' | 'NEEDS_RESUBMISSION';
    reasonCodes: string[];
    priority: number;
  };
}

export interface IAIService {
  analyzeDocument(
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
  }>;

  verifyFaceAndLiveness(
    selfieBuffer: Buffer,
    documentFrontBuffer: Buffer,
    caseId?: string,
    activeChallenge?: string
  ): Promise<{
    face: FaceVerificationResult;
    liveness: LivenessResult;
  }>;

  runFullPipeline(
    caseId: string,
    country: string,
    docType: string,
    frontBuffer: Buffer,
    backBuffer: Buffer | undefined,
    selfieBuffer: Buffer,
    policyConfig?: any
  ): Promise<AIAnalysisOutput>;
}
