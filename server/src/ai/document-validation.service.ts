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

    // --- Blur: Laplacian variance. blurScore 0=blurry, 1=sharp ---
    const blur = Number((1.0 - stats.blurScore).toFixed(3)); // invert: low is good

    // --- Glare: very high brightness means glare ---
    const glareRaw = stats.brightnessScore > 0.82 ? (stats.brightnessScore - 0.82) / 0.18 : 0;
    const glare = Number(Math.min(1.0, glareRaw).toFixed(3));

    // --- Brightness: optimal is 0.35-0.75 ---
    const brightness = Number(stats.brightnessScore.toFixed(3));

    // Build issues list
    const issues: string[] = [];

    if (stats.blurScore < 0.20) issues.push('IMAGE_TOO_BLURRY');
    if (stats.brightnessScore < 0.15) issues.push('IMAGE_TOO_DARK');
    if (stats.brightnessScore > 0.92) issues.push('IMAGE_OVEREXPOSED_OR_GLARE');
    if (stats.width < 400 || stats.height < 250) issues.push('RESOLUTION_TOO_LOW');
    if (!docRegion.looksLikeDocument) issues.push('NOT_A_DOCUMENT_IMAGE');
    if (!docRegion.aspectRatioOk) issues.push('WRONG_ASPECT_RATIO');
    if (!docRegion.hasTextRegions) issues.push('NO_TEXT_REGIONS_DETECTED');

    // Overall score
    let score = 1.0;
    score -= (1.0 - stats.blurScore) * 0.35;            // blur penalty
    score -= Math.max(0, stats.brightnessScore - 0.80) * 0.15; // glare penalty
    score -= Math.max(0, 0.25 - stats.brightnessScore) * 0.15; // darkness penalty
    score -= docRegion.looksLikeDocument ? 0 : 0.30;    // not-a-document penalty
    score -= docRegion.hasTextRegions ? 0 : 0.15;       // no text penalty
    score = Number(Math.max(0, Math.min(1.0, score)).toFixed(3));

    const passed = score >= 0.50 && issues.length === 0;

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
   * Validates document expiry, MRZ structure, and cross-field consistency
   */
  validateDocument(
    expiryDateStr: string,
    mrzValid: boolean,
    _caseId = 'demo-case'
  ): DocumentValidationResult {
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const expired = expiry.getTime() < now.getTime();
    const formatOk = !isNaN(expiry.getTime());
    const crossFieldOk = mrzValid && formatOk;

    const details: string[] = [];
    if (expired) details.push('DOCUMENT_EXPIRED');
    if (!mrzValid) details.push('MRZ_CHECKSUM_MISMATCH');
    if (!formatOk) details.push('INVALID_DATE_FORMAT');

    return { expired, formatOk, crossFieldOk, details };
  }
}
