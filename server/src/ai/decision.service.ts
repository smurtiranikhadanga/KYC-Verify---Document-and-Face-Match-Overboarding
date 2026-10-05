import {
  DocumentValidationResult,
  FaceVerificationResult,
  LivenessResult,
  OCRResult,
  TamperResult,
  QualityResult,
} from './ai.interface.js';

export interface DecisionPolicy {
  faceMatchThreshold: number;
  livenessThreshold: number;
  tamperThreshold: number;
  ocrConfidenceThreshold: number;
  autoApproveAllowed?: boolean;
}

export class DecisionService {
  /**
   * Applies business rules and jurisdiction policy thresholds to generate decision
   */
  evaluateDecision(
    quality: QualityResult,
    ocr: OCRResult,
    validation: DocumentValidationResult,
    face: FaceVerificationResult,
    liveness: LivenessResult,
    tamper: TamperResult,
    policy: DecisionPolicy = {
      faceMatchThreshold: 0.80,
      livenessThreshold: 0.85,
      tamperThreshold: 0.70,
      ocrConfidenceThreshold: 0.80,
      autoApproveAllowed: true,
    }
  ): {
    outcome: 'AUTO_APPROVED' | 'MANUAL_REVIEW' | 'AUTO_REJECTED' | 'NEEDS_RESUBMISSION';
    reasonCodes: string[];
    priority: number;
    riskScore: number;
    riskFlags: string[];
  } {
    const reasonCodes: string[] = [];
    const riskFlags: string[] = [];
    let priority = 50; // Standard priority 0-100
    let riskScore = 15; // Baseline low risk score

    // 1. Check Document Expired
    if (validation.expired) {
      reasonCodes.push('DOCUMENT_EXPIRED');
      riskFlags.push('EXPIRED_DOCUMENT');
      riskScore += 60;
      return {
        outcome: 'AUTO_REJECTED',
        reasonCodes,
        priority: 95,
        riskScore: Math.min(100, riskScore),
        riskFlags,
      };
    }

    // 2. Check Document Image Quality
    if (!quality.passed || quality.score < 0.70) {
      reasonCodes.push('QUALITY_BELOW_THRESHOLD');
      riskFlags.push('POOR_IMAGE_QUALITY');
      return {
        outcome: 'NEEDS_RESUBMISSION',
        reasonCodes,
        priority: 40,
        riskScore: 35,
        riskFlags,
      };
    }

    // 3. Check OCR Confidences
    const lowestOcrConf = Math.min(
      ocr.fields.fullName.confidence,
      ocr.fields.idNumber.confidence,
      ocr.fields.expiry.confidence
    );

    if (lowestOcrConf < policy.ocrConfidenceThreshold) {
      reasonCodes.push('OCR_LOW_CONF');
      riskFlags.push('OCR_UNREADABLE_FIELD');
      riskScore += 25;
      return {
        outcome: 'NEEDS_RESUBMISSION',
        reasonCodes,
        priority: 60,
        riskScore,
        riskFlags,
      };
    }

    // 4. Check Tamper
    if (tamper.flagged || tamper.score > policy.tamperThreshold) {
      reasonCodes.push('TAMPER_SUSPECT');
      riskFlags.push('TAMPER_ANOMALY_DETECTED');
      riskScore += 45;
      priority += 30;
    }

    // 5. Check Face Similarity
    if (!face.match || face.similarity < policy.faceMatchThreshold) {
      reasonCodes.push('LOW_FACE_MATCH');
      riskFlags.push('BIOMETRIC_MISMATCH');
      riskScore += 35;
      priority += 20;
    }

    // 6. Check Liveness
    if (!liveness.passed || liveness.score < policy.livenessThreshold) {
      reasonCodes.push('LIVENESS_BORDERLINE');
      riskFlags.push('LIVENESS_VERIFICATION_FAILED');
      riskScore += 30;
      priority += 20;
    }

    // 7. Synthesize Final Outcome
    if (riskScore >= 75 || tamper.score >= 0.85) {
      return {
        outcome: 'AUTO_REJECTED',
        reasonCodes: reasonCodes.length > 0 ? reasonCodes : ['HIGH_RISK_FRAUD_INDICATOR'],
        priority: Math.min(100, priority),
        riskScore: Math.min(100, riskScore),
        riskFlags,
      };
    }

    if (riskFlags.length > 0 || (policy.autoApproveAllowed === false)) {
      return {
        outcome: 'MANUAL_REVIEW',
        reasonCodes,
        priority: Math.min(100, priority),
        riskScore: Math.min(100, riskScore),
        riskFlags,
      };
    }

    // All passed cleanly
    return {
      outcome: 'AUTO_APPROVED',
      reasonCodes: ['ALL_CHECKS_PASSED'],
      priority: 10,
      riskScore: 12,
      riskFlags: [],
    };
  }
}
