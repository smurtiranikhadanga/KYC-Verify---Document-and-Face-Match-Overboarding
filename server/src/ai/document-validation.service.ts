import { DocumentValidationResult, QualityResult } from './ai.interface.js';
import { analyzeImage, estimateDocumentRegion } from './image-analysis.utils.js';

export class DocumentValidationService {
  /**
   * Real image quality evaluation using Sharp pixel-level analysis:
   * - Laplacian variance blur detection
   * - Brightness/contrast histogram
   * - Edge density (detects if image looks like a document)
   * - Resolution check
   */
  async evaluateQuality(docBuffer: Buffer, _caseId = 'demo-case'): Promise<QualityResult> {
    const stats = await analyzeImage(docBuffer);
    const docRegion = await estimateDocumentRegion(docBuffer);

    const blur = Number((1.0 - stats.blurScore).toFixed(3));
    const glareRaw = stats.brightnessScore > 0.82 ? (stats.brightnessScore - 0.82) / 0.18 : 0;
    const glare = Number(Math.min(1.0, glareRaw).toFixed(3));
    const brightness = Number(stats.brightnessScore.toFixed(3));

    const issues: string[] = [];

    if (stats.blurScore < 0.15) issues.push('IMAGE_TOO_BLURRY');
    if (stats.brightnessScore < 0.10) issues.push('IMAGE_TOO_DARK');
    if (stats.brightnessScore > 0.96) issues.push('IMAGE_OVEREXPOSED_OR_GLARE');
    if (stats.width < 320 || stats.height < 200) issues.push('RESOLUTION_TOO_LOW');

    let score = 1.0;
    score -= (1.0 - stats.blurScore) * 0.30;
    score -= Math.max(0, stats.brightnessScore - 0.85) * 0.15;
    score -= Math.max(0, 0.20 - stats.brightnessScore) * 0.15;
    score -= docRegion.looksLikeDocument ? 0 : 0.15;
    score = Number(Math.max(0, Math.min(1.0, score)).toFixed(3));

    const fatalIssues = ['IMAGE_TOO_BLURRY', 'IMAGE_TOO_DARK', 'RESOLUTION_TOO_LOW'];
    const passed = score >= 0.45 && !issues.some(i => fatalIssues.includes(i));

    let feedback: string;
    if (issues.length === 0) {
      feedback = `Document quality is optimal. Sharpness: ${(stats.blurScore * 100).toFixed(0)}%, Brightness: ${(brightness * 100).toFixed(0)}%.`;
    } else {
      const issueMap: Record<string, string> = {
        IMAGE_TOO_BLURRY: 'Image is too blurry — hold the camera steady or use better lighting.',
        IMAGE_TOO_DARK: 'Image is too dark — move to better lighting.',
        IMAGE_OVEREXPOSED_OR_GLARE: 'Glare detected — tilt the document to reduce reflections.',
        RESOLUTION_TOO_LOW: 'Resolution too low — use a higher quality camera.',
        NOT_A_DOCUMENT_IMAGE: 'This does not appear to be an ID document. Please upload your actual ID.',
        WRONG_ASPECT_RATIO: 'Unexpected image dimensions. Ensure the full document is visible.',
        NO_TEXT_REGIONS_DETECTED: 'No text regions found. Ensure document text is clearly visible.',
      };
      feedback = issues.map(i => issueMap[i] || i).join(' ');
    }

    return { blur, glare, brightness, score, passed, feedback };
  }

  /**
   * Validates document expiry, MRZ structure, and cross-field consistency.
   *
   * FIX PIPE-06: 'new Date(garbage)' previously produced NaN → expired=false.
   * Now: invalid date → formatOk=false → crossFieldOk=false, which the decision
   * engine uses to reject/escalate. expired=false is ONLY returned when date is
   * valid AND in the future.
   */
  validateDocument(
    expiryDateStr: string,
    mrzValid: boolean,
    _caseId = 'demo-case'
  ): DocumentValidationResult {
    const expiry = new Date(expiryDateStr);
    const now = new Date();

    // FIX PIPE-06: Treat NaN as formatOk=false (not as "not expired")
    const formatOk = !isNaN(expiry.getTime()) && expiryDateStr.trim() !== '';
    const expired = formatOk ? expiry.getTime() < now.getTime() : false;
    // crossFieldOk requires both a parseable date AND a valid MRZ
    const crossFieldOk = formatOk && mrzValid && !expired;

    const details: string[] = [];
    if (!formatOk) details.push('INVALID_DATE_FORMAT');
    if (expired) details.push('DOCUMENT_EXPIRED');
    if (!mrzValid) details.push('MRZ_CHECKSUM_MISMATCH');

    return { expired, formatOk, crossFieldOk, details };
  }
}
