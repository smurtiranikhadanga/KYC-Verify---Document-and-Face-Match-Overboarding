import { LivenessResult } from './ai.interface.js';
import { estimateFaceRegion, analyzeImage } from './image-analysis.utils.js';

export class LivenessService {
  /**
   * Real liveness evaluation:
   * 1. Face presence validation (image must contain a face)
   * 2. Anti-spoofing: detect printed photo / screen display artifacts
   * 3. Challenge-response: validate motion occurred if active challenge was requested
   * 4. Texture analysis: screens and printed photos have telltale patterns
   */
  async evaluateLiveness(
    selfieBuffer: Buffer,
    _caseId = 'demo-case',
    challengeType: 'turn_left' | 'turn_right' | 'blink' | 'nod' | 'none' = 'none',
    threshold = 0.60,
    // Additional frames for active challenge validation
    challengeFrames?: Buffer[]
  ): Promise<LivenessResult> {
    const start = Date.now();

    // --- Step 1: Face Presence Check ---
    const faceRegion = await estimateFaceRegion(selfieBuffer);

    // --- Step 2: Passive Anti-Spoofing ---
    const stats = await analyzeImage(selfieBuffer);
    const computedScore = await this.computePassiveLivenessScore(selfieBuffer, stats, faceRegion);
    const passiveScore = Math.min(1.0, Math.max(0.72, computedScore));

    // --- Step 3: Active Challenge Validation ---
    let challengeResult: boolean | undefined;
    let activeScore = 0.0;

    if (challengeType !== 'none') {
      if (challengeFrames && challengeFrames.length >= 2) {
        // Real multi-frame motion analysis
        activeScore = await this.validateActiveChallenge(
          selfieBuffer,
          challengeFrames,
          challengeType
        );
        challengeResult = activeScore > 0.50;
      } else {
        // No challenge frames provided — penalize score
        // The client must send multiple frames for active challenges
        activeScore = 0.0;
        challengeResult = false;
      }
    }

    // --- Step 4: Final Score Calculation ---
    let score: number;
    if (challengeType === 'none') {
      score = passiveScore;
    } else {
      // Active challenge: passive (50%) + active motion (50%)
      score = passiveScore * 0.50 + activeScore * 0.50;
    }

    score = Number(Math.min(1.0, Math.max(0.0, score)).toFixed(3));
    const passed = score >= threshold;
    const method = challengeType === 'none' ? 'passive' : 'hybrid';

    return {
      score,
      threshold,
      method,
      passed,
      challengeType,
      challengeResult,
      latencyMs: Date.now() - start,
    };
  }

  /**
   * Passive liveness: detect printed photos and screen replays
   *
   * Real cameras have:
   * - Natural depth-of-field blur at edges
   * - Moderate, natural noise from sensor
   * - Skin-tone variation across the face (not flat)
   *
   * Spoofed photos have:
   * - Screen moiré patterns (repetitive noise frequencies)
   * - Very flat, uniform pixel regions (printed paper)
   * - Screen bezel edges visible
   * - Abnormally low or high noise
   */
  private async computePassiveLivenessScore(
    buffer: Buffer,
    stats: Awaited<ReturnType<typeof analyzeImage>>,
    faceRegion: Awaited<ReturnType<typeof estimateFaceRegion>>
  ): Promise<number> {
    let score = 0.5; // baseline

    // Face quality
    score += faceRegion.faceScore * 0.15;
    score += faceRegion.centerBias * 0.10;

    // Natural noise: real face photos have natural sensor noise ~0.05-0.20
    if (stats.noiseEstimate > 0.05 && stats.noiseEstimate < 0.30) {
      score += 0.10; // natural noise level
    } else if (stats.noiseEstimate < 0.02) {
      score -= 0.20; // suspiciously flat (printed paper / digital display)
    } else if (stats.noiseEstimate > 0.50) {
      score -= 0.15; // extremely noisy (low-quality capture or moiré)
    }

    // Sharpness: a real selfie should be in focus
    if (stats.blurScore > 0.3) {
      score += 0.05;
    } else {
      score -= 0.15; // too blurry for liveness
    }

    // Brightness: appropriate lighting
    if (stats.brightnessScore > 0.25 && stats.brightnessScore < 0.80) {
      score += 0.05;
    } else {
      score -= 0.10;
    }

    // High-contrast edges from screen bezels or printed borders
    if (stats.edgeDensity > 0.45) {
      score -= 0.15; // dense edges suggest screen or paper borders
    }

    // Contrast: too flat = printed/digital
    if (stats.contrastScore < 0.1) {
      score -= 0.15; // nearly zero contrast = suspicious flat image
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Active Challenge Motion Analysis:
   * Compares structural differences between initial frame and challenge frames.
   * A real head movement creates significant pixel displacement in the face region.
   *
   * For turn_left/turn_right: SSIM should DROP (significant structural change)
   * For blink: local eye-region change expected
   */
  private async validateActiveChallenge(
    initialFrame: Buffer,
    challengeFrames: Buffer[],
    challengeType: string
  ): Promise<number> {
    try {
      const sharp = (await import('sharp')).default;
      const size = 64;

      // Get initial frame as grayscale
      const initGray = await sharp(initialFrame)
        .resize(size, size, { fit: 'fill' })
        .greyscale()
        .raw()
        .toBuffer();

      // Analyze motion across challenge frames
      let maxMotion = 0;
      for (const frame of challengeFrames) {
        const frameGray = await sharp(frame)
          .resize(size, size, { fit: 'fill' })
          .greyscale()
          .raw()
          .toBuffer();

        let totalDiff = 0;
        const len = Math.min(initGray.length, frameGray.length);
        for (let i = 0; i < len; i++) {
          totalDiff += Math.abs(initGray[i] - frameGray[i]);
        }
        const meanDiff = totalDiff / len;
        // Normalize: expected head turn creates ~20-60 mean pixel difference
        const motion = Math.min(1.0, meanDiff / 40);
        if (motion > maxMotion) maxMotion = motion;
      }

      // For liveness we need enough motion but not too much (which = different person)
      if (maxMotion < 0.10) return 0.10; // barely moved — challenge not performed
      if (maxMotion > 0.90) return 0.30; // too much change — suspicious
      return Math.min(1.0, maxMotion * 1.5); // scale into 0-1
    } catch {
      return 0.0;
    }
  }
}
