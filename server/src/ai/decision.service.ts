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
  minimumAgeYears?: number; // FIX PIPE-08
}

export class DecisionService {
  /**
   * Applies business rules and jurisdiction policy thresholds to generate decision.
   * FIX PIPE-06: Now uses ALL validation signals including crossFieldOk, formatOk, mrzValid.
   * FIX PIPE-08: Now checks minimum age from DOB.
   * FIX PIPE-16: Runs all checks regardless of earlier failures (no early-exit before collecting all signals).
   */
  evaluateDecision(
    quality: QualityResult,
    ocr: OCRResult,
    validation: DocumentValidationResult,
    face: FaceVerificationResult,
    liveness: LivenessResult,
    tamper: TamperResult,
    policy: DecisionPolicy = {
      faceMatchThreshold: 0.55,
      livenessThreshold: 0.60,
      tamperThreshold: 0.55,
      ocrConfidenceThreshold: 0.80,
      autoApproveAllowed: true,
      minimumAgeYears: 18,
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
    let priority = 50;
    let riskScore = 15;

    // ── 1. Document Expired ──────────────────────────────────────────────────
    if (validation.expired) {
      reasonCodes.push('DOCUMENT_EXPIRED');
      riskFlags.push('EXPIRED_DOCUMENT');
      riskScore += 60;
    }

    // ── FIX PIPE-06: MRZ and date format validation ──────────────────────────
    if (!validation.formatOk) {
      reasonCodes.push('INVALID_DATE_FORMAT');
      riskFlags.push('DOCUMENT_DATE_UNPARSEABLE');
      riskScore += 30;
    }

    if (!validation.crossFieldOk) {
      // crossFieldOk = mrzValid && formatOk
      reasonCodes.push('MRZ_CHECKSUM_INVALID');
      riskFlags.push('MRZ_VALIDATION_FAILED');
      riskScore += 40;
    }

    // FIX N-10: Removed early exit here to allow collection of all fraud signals (PIPE-16).
    // Instead of early return, we just accrue the reasonCodes and riskScore which will
    // lead to AUTO_REJECTED or MANUAL_REVIEW in the final synthesis.

    // ── 2. Image Quality ─────────────────────────────────────────────────────
    if (!quality.passed || quality.score < 0.70) {
      reasonCodes.push('QUALITY_BELOW_THRESHOLD');
      riskFlags.push('POOR_IMAGE_QUALITY');
      // Don't return early — still collect all fraud signals below
    }

    // ── 3. OCR Confidence ────────────────────────────────────────────────────
    const lowestOcrConf = Math.min(
      ocr.fields.fullName?.confidence ?? 0,
      ocr.fields.idNumber?.confidence ?? 0,
      ocr.fields.expiry?.confidence ?? 0
    );

    if (lowestOcrConf < policy.ocrConfidenceThreshold) {
      reasonCodes.push('OCR_LOW_CONF');
      riskFlags.push('OCR_UNREADABLE_FIELD');
      riskScore += 25;
    }

    // ── FIX N-09: OCR Data Missing & Minimum Age Check ───────────────────────
    // Reject if critical fields are completely empty (prevent fail-open)
    if (!ocr.fields.fullName?.value || !ocr.fields.idNumber?.value || !ocr.fields.dob?.value) {
      reasonCodes.push('OCR_MISSING_DATA');
      riskFlags.push('MISSING_CRITICAL_DATA');
      riskScore += 40;
    }

    const minAge = policy.minimumAgeYears ?? 18;
    if (ocr.fields.dob?.value) {
      const dob = new Date(ocr.fields.dob.value);
      if (!isNaN(dob.getTime())) {
        const ageMs = Date.now() - dob.getTime();
        const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
        if (ageYears < minAge) {
          reasonCodes.push('APPLICANT_UNDERAGE');
          riskFlags.push('MINIMUM_AGE_NOT_MET');
          riskScore += 50;
        }
      } else {
        reasonCodes.push('DOB_UNPARSEABLE');
        riskFlags.push('INVALID_DATE_OF_BIRTH');
        riskScore += 20;
      }
    } else {
      // DOB is missing entirely
      reasonCodes.push('DOB_MISSING');
      riskFlags.push('INVALID_DATE_OF_BIRTH');
      riskScore += 20;
    }

    // ── 4. Tamper ────────────────────────────────────────────────────────────
    // FIX PIPE-05: Only flag tamper on ELA+FFT score, not on missing EXIF alone
    // (EXIF-stripped JPEG from webcam is normal and should NOT be penalised alone)
    const tamperFlaggedByScore = tamper.score > policy.tamperThreshold;
    const tamperFlaggedBySoftware = tamper.metadataFlags.includes('EXIF_EDITING_SOFTWARE_DETECTED');
    if (tamperFlaggedByScore || tamperFlaggedBySoftware) {
      reasonCodes.push('TAMPER_SUSPECT');
      riskFlags.push('TAMPER_ANOMALY_DETECTED');
      riskScore += 45;
      priority += 30;
    }

    // ── 5. Face Similarity ───────────────────────────────────────────────────
    // FIX PIPE-07: Propagate specific face error codes
    if ((face as any).error) {
      const faceError: string = (face as any).error;
      reasonCodes.push(faceError);
      riskFlags.push('BIOMETRIC_ERROR');
      riskScore += 30;
      priority += 15;
    } else if (!face.match || face.similarity < policy.faceMatchThreshold) {
      reasonCodes.push('LOW_FACE_MATCH');
      riskFlags.push('BIOMETRIC_MISMATCH');
      riskScore += 35;
      priority += 20;
    }

    // ── 6. Liveness ──────────────────────────────────────────────────────────
    if ((liveness as any).error) {
      reasonCodes.push((liveness as any).error);
      riskFlags.push('LIVENESS_ERROR');
      riskScore += 25;
      priority += 15;
    } else if (!liveness.passed || liveness.score < policy.livenessThreshold) {
      // FIX PIPE-16: Liveness failure alone should auto-reject when score is very low
      if (liveness.score < policy.livenessThreshold * 0.5) {
        reasonCodes.push('LIVENESS_FAILED');
        riskFlags.push('LIVENESS_VERIFICATION_FAILED');
        riskScore += 50;
        priority += 30;
      } else {
        reasonCodes.push('LIVENESS_BORDERLINE');
        riskFlags.push('LIVENESS_BORDERLINE');
        riskScore += 30;
        priority += 20;
      }
    }

    // ── 7. Quality-only → resubmit if that's the only issue ─────────────────
    const onlyQualityIssue =
      riskFlags.length === 1 && riskFlags[0] === 'POOR_IMAGE_QUALITY' && riskScore < 50;
    if (onlyQualityIssue) {
      return {
        outcome: 'NEEDS_RESUBMISSION',
        reasonCodes,
        priority: 40,
        riskScore: 35,
        riskFlags,
      };
    }

    // ── 8. Synthesize Final Outcome ──────────────────────────────────────────
    const hardReject = riskScore >= 80 || tamper.score >= 0.85 || riskFlags.includes('MINIMUM_AGE_NOT_MET');
    if (hardReject) {
      return {
        outcome: 'AUTO_REJECTED',
        reasonCodes: reasonCodes.length > 0 ? reasonCodes : ['HIGH_RISK_FRAUD_INDICATOR'],
        priority: Math.min(100, priority),
        riskScore: Math.min(100, riskScore),
        riskFlags,
      };
    }

    if (riskFlags.length > 0 || policy.autoApproveAllowed === false) {
      return {
        outcome: 'MANUAL_REVIEW',
        reasonCodes,
        priority: Math.min(100, priority),
        riskScore: Math.min(100, riskScore),
        riskFlags,
      };
    }

    // All checks passed cleanly
    return {
      outcome: 'AUTO_APPROVED',
      reasonCodes: ['ALL_CHECKS_PASSED'],
      priority: 10,
      riskScore: 12,
      riskFlags: [],
    };
  }
}
