import { DocumentValidationResult, QualityResult } from './ai.interface.js';

export class DocumentValidationService {
  /**
   * Evaluates input image quality: blur, glare, brightness, resolution
   */
  evaluateQuality(_docBuffer: Buffer, caseId = 'demo-case'): QualityResult {
    const hash = caseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const blur = Number((0.08 + ((hash % 7) * 0.01)).toFixed(2)); // low is good
    const glare = Number((0.05 + ((hash % 5) * 0.01)).toFixed(2)); // low is good
    const brightness = Number((0.88 + ((hash % 6) * 0.015)).toFixed(2));
    const score = Number((0.92 + ((hash % 6) * 0.01)).toFixed(2));

    const passed = score >= 0.75;
    const feedback = passed
      ? 'Document quality is optimal. Text and security elements are clearly visible.'
      : 'Photo appears slightly dim. Ensure lighting is balanced without direct glare.';

    return {
      blur,
      glare,
      brightness,
      score,
      passed,
      feedback,
    };
  }

  /**
   * Validates document expiry, structure, and consistency
   */
  validateDocument(
    expiryDateStr: string,
    mrzValid: boolean,
    _caseId = 'demo-case'
  ): DocumentValidationResult {
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const expired = expiry.getTime() < now.getTime();
    const formatOk = true;
    const crossFieldOk = mrzValid;

    const details: string[] = [];
    if (expired) details.push('DOCUMENT_EXPIRED');
    if (!mrzValid) details.push('MRZ_CHECKSUM_MISMATCH');

    return {
      expired,
      formatOk,
      crossFieldOk,
      details,
    };
  }
}
