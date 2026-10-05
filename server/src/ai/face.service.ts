import { FaceVerificationResult } from './ai.interface.js';

export class FaceService {
  /**
   * Simulates DeepFace ArcFace + RetinaFace embedding similarity comparison
   */
  async compareFaces(
    _selfieBuffer: Buffer,
    _docBuffer: Buffer,
    caseId = 'demo-case',
    threshold = 0.80
  ): Promise<FaceVerificationResult> {
    const hash = caseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Realistic similarity score between 0.82 and 0.97 by default
    const variance = (hash % 15) * 0.01;
    const similarity = Number((0.83 + variance).toFixed(3));
    const distance = Number((1.0 - similarity).toFixed(3));
    const match = similarity >= threshold;
    const confidence = Number((similarity * 0.98).toFixed(3));
    const latency = 380 + (hash % 150);

    return {
      model: 'ArcFace',
      detector: 'RetinaFace',
      similarity,
      distance,
      threshold,
      match,
      confidence,
      latencyMs: latency,
    };
  }
}
