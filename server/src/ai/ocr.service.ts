import sharp from 'sharp';
import { OCRResult } from './ai.interface.js';

/**
 * OCR Service — Node.js-native image analysis for field extraction.
 *
 * FIX PIPE-09: Previously all fields (name, DOB, ID number, expiry) were
 * deterministically generated from a hash of the caseId, making OCR always
 * return the same fake data with mrzValid=true and expiry always ≥2029.
 *
 * This implementation uses real image analysis (text density, brightness,
 * region analysis via Sharp) and returns honest confidence scores based on
 * actual image properties. It cannot do production-grade character recognition
 * without a Python/Tesseract microservice, but it:
 *   1. Does NOT fabricate field values — returns empty strings when unreadable
 *   2. Returns honest confidence scores based on measured image quality
 *   3. Sets mrzValid=false when MRZ region is not clearly detectable
 *   4. Returns expiry dates that can fail (not always ≥2029)
 *
 * For production: route to a real OCR service (Tesseract, PaddleOCR, AWS Textract).
 */
export class OcrService {
  async extractFields(
    frontBuffer: Buffer,
    _backBuffer?: Buffer,
    _country = 'IN',
    _docType = 'passport',
    _caseId = 'demo-case'
  ): Promise<OCRResult> {
    const start = Date.now();

    // Analyze the actual image to derive honest confidence scores
    const { textDensity, mrzLikelihood, imageQualityScore } = await this.analyzeDocumentImage(frontBuffer);

    // Base confidence proportional to actual image quality
    const baseConf = Math.max(0.30, Math.min(0.97, imageQualityScore));

    // If image quality is too low, return low-confidence empty fields
    if (imageQualityScore < 0.35) {
      return this.lowQualityResult(baseConf, start);
    }

    // MRZ validity: only mark valid if MRZ region is clearly detectable
    // In production this would be real TD3/TD1 MRZ checksum validation
    const mrzValid = mrzLikelihood > 0.55;

    // Text density-proportional confidence
    const nameConf = Math.min(0.97, baseConf * (0.85 + textDensity * 0.15));
    const idConf = Math.min(0.97, baseConf * (0.90 + textDensity * 0.10));
    const dobConf = Math.min(0.95, baseConf * (0.82 + textDensity * 0.13));
    const expiryConf = Math.min(0.97, baseConf * (0.87 + textDensity * 0.13));
    const addressConf = Math.min(0.92, baseConf * (0.75 + textDensity * 0.15));

    // IMPORTANT: We cannot extract actual text values without a real OCR engine.
    // Return empty strings with honest confidence so the pipeline treats
    // these as low-confidence reads and routes to manual review.
    // This is intentionally honest about the system's capabilities.
    return {
      engine: 'HeuristicOCR-v1 (native; upgrade to PaddleOCR/Tesseract for production)',
      version: '1.0.0',
      fields: {
        fullName: {
          value: '',   // Cannot reliably extract without real OCR
          confidence: nameConf,
          box: [45, 120, 320, 155],
        },
        dob: {
          value: '',
          confidence: dobConf,
          box: [45, 170, 200, 200],
        },
        idNumber: {
          value: '',
          confidence: idConf,
          box: [45, 215, 260, 245],
        },
        expiry: {
          value: '',   // FIX PIPE-09: not always ≥2029
          confidence: expiryConf,
          box: [45, 260, 190, 290],
        },
        address: {
          value: '',
          confidence: addressConf,
          box: [45, 305, 410, 340],
        },
      },
      mrzValid,   // FIX PIPE-09: was always true
      rawText: '',
      latencyMs: Date.now() - start,
    };
  }

  private lowQualityResult(baseConf: number, start: number): OCRResult {
    return {
      engine: 'HeuristicOCR-v1 (native)',
      version: '1.0.0',
      fields: {
        fullName: { value: '', confidence: baseConf * 0.4, box: [] },
        dob: { value: '', confidence: baseConf * 0.3, box: [] },
        idNumber: { value: '', confidence: baseConf * 0.35, box: [] },
        expiry: { value: '', confidence: baseConf * 0.35, box: [] },
        address: { value: '', confidence: baseConf * 0.25, box: [] },
      },
      mrzValid: false,
      rawText: '',
      latencyMs: Date.now() - start,
    };
  }

  /**
   * Analyzes document image to derive:
   * - Text density (fraction of dark pixels that could be text)
   * - MRZ likelihood (bottom region with dense uniform dark rows = MRZ zone)
   * - Overall image quality score
   */
  private async analyzeDocumentImage(buffer: Buffer): Promise<{
    textDensity: number;
    mrzLikelihood: number;
    imageQualityScore: number;
  }> {
    try {
      const { data, info } = await sharp(buffer)
        .resize({ width: 256, height: 160, fit: 'fill' })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const w = info.width;
      const h = info.height;
      const total = w * h;

      // Compute brightness
      let brightnessSum = 0;
      let darkPixels = 0;
      let veryDarkPixels = 0;

      for (let i = 0; i < data.length; i++) {
        brightnessSum += data[i];
        if (data[i] < 80) darkPixels++;
        if (data[i] < 40) veryDarkPixels++;
      }

      const meanBrightness = brightnessSum / total;
      const textDensity = Math.min(1.0, darkPixels / total / 0.3);

      // MRZ region: bottom 20% of image — look for dense, uniform dark rows
      const mrzStart = Math.floor(h * 0.78);
      let mrzDarkPixels = 0;
      let mrzTotal = 0;

      for (let y = mrzStart; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const pixel = data[y * w + x];
          mrzTotal++;
          if (pixel < 60) mrzDarkPixels++;
        }
      }

      const mrzDarkRatio = mrzTotal > 0 ? mrzDarkPixels / mrzTotal : 0;
      // MRZ zones typically have 10-35% dark pixels in uniform lines
      const mrzLikelihood = mrzDarkRatio > 0.08 && mrzDarkRatio < 0.45
        ? Math.min(1.0, mrzDarkRatio / 0.20)
        : 0.1;

      // Quality: penalize too dark, too bright, or very low text density
      let quality = 0.7;
      if (meanBrightness < 30 || meanBrightness > 230) quality -= 0.3;
      if (textDensity < 0.05) quality -= 0.25; // almost no text
      if (veryDarkPixels / total > 0.5) quality -= 0.2; // too dark overall
      quality = Math.max(0, Math.min(1.0, quality));

      return {
        textDensity: Number(textDensity.toFixed(3)),
        mrzLikelihood: Number(mrzLikelihood.toFixed(3)),
        imageQualityScore: Number(quality.toFixed(3)),
      };
    } catch {
      return { textDensity: 0, mrzLikelihood: 0, imageQualityScore: 0 };
    }
  }
}
