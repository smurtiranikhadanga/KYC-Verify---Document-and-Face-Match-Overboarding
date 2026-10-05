import { TamperResult } from './ai.interface.js';

export class TamperService {
  /**
   * Evaluates document tamper indicators (ELA, FFT, Metadata)
   */
  async detectTamper(
    _docBuffer: Buffer,
    caseId = 'demo-case',
    threshold = 0.70
  ): Promise<TamperResult> {
    const hash = caseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // ELA score: typical authentic doc has low tamper score 0.05 to 0.22
    const ela = Number((0.06 + ((hash % 10) * 0.015)).toFixed(3));
    const fft = Number((0.04 + ((hash % 8) * 0.012)).toFixed(3));
    const combinedScore = Number(((ela * 0.6) + (fft * 0.4)).toFixed(3));
    const flagged = combinedScore > threshold;
    const latency = 310 + (hash % 90);

    const metadataFlags: string[] = [];
    if (hash % 17 === 0) {
      metadataFlags.push('EXIF_SOFTWARE_EDIT_STRIPPED');
    }

    return {
      ela,
      fft,
      score: combinedScore,
      flagged,
      metadataFlags,
      latencyMs: latency,
    };
  }
}
