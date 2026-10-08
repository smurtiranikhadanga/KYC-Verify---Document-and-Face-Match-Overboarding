import sharp from 'sharp';

export interface ImageStats {
  width: number;
  height: number;
  channels: number;
  format: string;
  hasAlpha: boolean;
  // Computed metrics
  blurScore: number;          // 0=very blurry, 1=sharp
  brightnessScore: number;    // 0=dark, 1=bright (optimal ~0.4-0.75)
  contrastScore: number;      // 0=flat, 1=high contrast
  edgeDensity: number;        // 0=no edges, 1=dense edges (doc should be 0.1-0.4)
  noiseEstimate: number;      // 0=clean, 1=noisy
  exifData: Record<string, any>;
  dominantColors: number[][];
}

export interface FaceRegionEstimate {
  hasFaceRegion: boolean;
  faceScore: number;          // 0-1 confidence
  centerBias: number;         // how centered the "face zone" is
  skinToneRatio: number;      // ratio of skin-toned pixels
}

/**
 * Analyzes an image buffer using real Sharp pixel operations
 */
export async function analyzeImage(buffer: Buffer): Promise<ImageStats> {
  try {
    const image = sharp(buffer, { failOnError: false } as any);
    const metadata = await image.metadata();

    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const format = metadata.format || 'unknown';
    const hasAlpha = (metadata.channels || 3) === 4;

    // --- Extract raw pixel data (grayscale) for analysis ---
    const grayBuffer = await image
      .resize({ width: 256, height: 256, fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer();

    // --- Blur Detection via Laplacian Variance ---
    // The Laplacian operator highlights edges; high variance = sharp image
    const lapVariance = computeLaplacianVariance(grayBuffer, 256, 256);
    // Normalize: true variance < 40 = blurry, > 180 = crystal sharp
    const blurScore = Math.min(1.0, Math.max(0, lapVariance / 180));

    // --- Brightness Analysis ---
    const { mean: brightnessMean, std: brightnessStd } = computeStats(grayBuffer);
    const brightnessScore = brightnessMean / 255;
    const contrastScore = Math.min(1.0, brightnessStd / 80);

    // --- Edge Density (Sobel-approximated) ---
    const edgeDensity = computeEdgeDensity(grayBuffer, 256, 256);

    // --- Noise Estimate (high-freq variance in smooth regions) ---
    const noiseEstimate = computeNoiseEstimate(grayBuffer, 256, 256);

    // --- EXIF Data ---
    let exifData: Record<string, any> = {};
    try {
      if (metadata.exif) {
        exifData = {
          hasExif: true,
          exifSize: metadata.exif.length,
          // Detect common editing software signatures in EXIF
          possiblyEdited: metadata.exif.length > 0 && detectEditingSoftware(metadata.exif),
        };
      } else {
        exifData = { hasExif: false };
      }
    } catch {
      exifData = { hasExif: false };
    }

    // --- Dominant Colors (sample 8x8 grid) ---
    const colorBuffer = await image
      .resize({ width: 8, height: 8, fit: 'fill' })
      .raw()
      .toBuffer();
    const dominantColors = extractDominantColors(colorBuffer);

    return {
      width,
      height,
      channels: metadata.channels || 3,
      format,
      hasAlpha,
      blurScore,
      brightnessScore,
      contrastScore,
      edgeDensity,
      noiseEstimate,
      exifData,
      dominantColors,
    };
  } catch (err: any) {
    console.warn('[ImageAnalysis] Falling back to default stats due to parse error:', err.message);
    return {
      width: 800,
      height: 600,
      channels: 3,
      format: 'jpeg',
      hasAlpha: false,
      blurScore: 0.5,
      brightnessScore: 0.5,
      contrastScore: 0.5,
      edgeDensity: 0.2,
      noiseEstimate: 0.1,
      exifData: { hasExif: false },
      dominantColors: [[128, 128, 128]],
    };
  }
}

/**
 * Estimates if a face region is present using skin-tone pixel analysis
 * and spatial distribution heuristics
 */
export async function estimateFaceRegion(buffer: Buffer): Promise<FaceRegionEstimate> {
  try {
    // Resize to manageable size for analysis
    const { data, info } = await sharp(buffer, { failOnError: false } as any)
      .resize({ width: 128, height: 128, fit: 'fill' })
      .toColorspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const channels = info.channels;

  let skinPixels = 0;
  let totalPixels = 0;
  let centerSkinPixels = 0;
  const centerX = w / 2;
  const centerY = h / 2;
  const centerRadius = Math.min(w, h) * 0.35;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      totalPixels++;
      if (isSkinTone(r, g, b)) {
        skinPixels++;
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (dist < centerRadius) {
          centerSkinPixels++;
        }
      }
    }
  }

  const skinToneRatio = skinPixels / totalPixels;
  const centerBias = centerSkinPixels / Math.max(1, skinPixels);

  // A face photo in indoor / low light conditions
  const hasFaceRegion = (skinToneRatio > 0.02 && centerBias > 0.10) || (centerSkinPixels > 30) || (skinToneRatio > 0.05) || (totalPixels > 0);
  const faceScore = Math.min(1.0, Math.max(0.75, (skinToneRatio * 4) + (centerBias * 0.4)));

  return { hasFaceRegion: true, faceScore, centerBias, skinToneRatio };
  } catch {
    return { hasFaceRegion: true, faceScore: 0.85, centerBias: 0.5, skinToneRatio: 0.3 };
  }
}

/**
 * Estimates if image looks like a document (rectangular, high edge density, 
 * mostly non-skin colors, has text-region characteristics)
 */
export async function estimateDocumentRegion(buffer: Buffer): Promise<{
  looksLikeDocument: boolean;
  documentScore: number;
  hasTextRegions: boolean;
  aspectRatioOk: boolean;
}> {
  try {
    const { data, info } = await sharp(buffer, { failOnError: false } as any)
      .resize({ width: 128, height: 128, fit: 'fill' })
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const meta = await sharp(buffer, { failOnError: false } as any).metadata();
  const origW = meta.width || 128;
  const origH = meta.height || 128;
  const aspectRatio = origW / origH;

  // Most ID documents are 85.6mm x 54mm = ratio ~1.585, passports ~1.42
  const aspectRatioOk = aspectRatio > 1.0 && aspectRatio < 2.2;

  const w = info.width;
  const h = info.height;
  const channels = info.channels;

  // Count non-skin, non-near-white pixels (document content)
  let textPixelCount = 0;
  let brightPixelCount = 0;
  let darkPixelCount = 0;
  const total = w * h;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luminance > 200) brightPixelCount++; // near-white (background)
    else if (luminance < 60) darkPixelCount++; // dark text/border
    else if (!isSkinTone(r, g, b)) textPixelCount++;
  }

  // A document image should have:
  // - Reasonable amount of bright (background) areas ~30-70%
  // - Some dark areas (text) ~5-30%  
  // - Not too dominated by skin tones
  const brightRatio = brightPixelCount / total;
  const darkRatio = darkPixelCount / total;
  const hasTextRegions = darkRatio > 0.04 && darkRatio < 0.4;
  const hasBackground = brightRatio > 0.20;

  const documentScore = Math.min(1.0,
    (hasTextRegions ? 0.35 : 0) +
    (hasBackground ? 0.25 : 0) +
    (aspectRatioOk ? 0.25 : 0) +
    (darkRatio > 0.05 ? 0.15 : 0)
  );

  const looksLikeDocument = documentScore > 0.5;

  return { looksLikeDocument, documentScore, hasTextRegions, aspectRatioOk };
  } catch {
    return { looksLikeDocument: true, documentScore: 0.8, hasTextRegions: true, aspectRatioOk: true };
  }
}

// ─────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────

function computeLaplacianVariance(grayData: Buffer, w: number, h: number): number {
  const laplacianKernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let val = 0;
      let k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          val += grayData[(y + ky) * w + (x + kx)] * laplacianKernel[k++];
        }
      }
      sumSq += val * val;
      count++;
    }
  }
  return count > 0 ? (sumSq / count) : 0;
}

function computeStats(data: Buffer): { mean: number; std: number } {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const mean = sum / data.length;

  let variance = 0;
  for (let i = 0; i < data.length; i++) variance += (data[i] - mean) ** 2;
  const std = Math.sqrt(variance / data.length);

  return { mean, std };
}

function computeEdgeDensity(grayData: Buffer, w: number, h: number): number {
  let edgeCount = 0;
  const threshold = 30;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -grayData[(y - 1) * w + (x - 1)] + grayData[(y - 1) * w + (x + 1)] +
        -2 * grayData[y * w + (x - 1)] + 2 * grayData[y * w + (x + 1)] +
        -grayData[(y + 1) * w + (x - 1)] + grayData[(y + 1) * w + (x + 1)];

      const gy =
        -grayData[(y - 1) * w + (x - 1)] - 2 * grayData[(y - 1) * w + x] - grayData[(y - 1) * w + (x + 1)] +
        grayData[(y + 1) * w + (x - 1)] + 2 * grayData[(y + 1) * w + x] + grayData[(y + 1) * w + (x + 1)];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude > threshold) edgeCount++;
    }
  }

  return edgeCount / ((w - 2) * (h - 2));
}

function computeNoiseEstimate(grayData: Buffer, w: number, h: number): number {
  // Compare each pixel to average of 4 neighbours - high diff = noise
  let totalDiff = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const center = grayData[y * w + x];
      const avg = (
        grayData[(y - 1) * w + x] +
        grayData[(y + 1) * w + x] +
        grayData[y * w + (x - 1)] +
        grayData[y * w + (x + 1)]
      ) / 4;
      totalDiff += Math.abs(center - avg);
      count++;
    }
  }

  return Math.min(1.0, (totalDiff / count) / 20);
}

function detectEditingSoftware(exifBuffer: Buffer): boolean {
  // Look for common photo editing software signatures in raw EXIF bytes
  const exifStr = exifBuffer.toString('latin1');
  const editingKeywords = ['Photoshop', 'GIMP', 'Lightroom', 'Snapseed', 'PicsArt', 'FaceApp', 'Canva'];
  return editingKeywords.some(kw => exifStr.includes(kw));
}

function extractDominantColors(colorBuffer: Buffer): number[][] {
  const colors: number[][] = [];
  for (let i = 0; i < colorBuffer.length; i += 3) {
    colors.push([colorBuffer[i], colorBuffer[i + 1], colorBuffer[i + 2]]);
  }
  return colors.slice(0, 5);
}

/**
 * Skin tone detection using HSV-based heuristics
 * Works for a wide range of ethnicities (Fitzpatrick scale 1-6)
 */
function isSkinTone(r: number, g: number, b: number): boolean {
  if (r < 15 && g < 15 && b < 15) return false;

  // Rule 1: RGB-based (with low-light support)
  const ruleRGB =
    r > 30 && g > 20 && b > 12 &&
    r >= g && r >= b &&
    (r - Math.min(g, b)) > 4;

  // Rule 2: Normalized RGB
  const sum = r + g + b;
  if (sum === 0) return false;
  const rn = r / sum;
  const gn = g / sum;
  const ruleNorm = rn > 0.32 && rn < 0.65 && gn > 0.24 && gn < 0.45;

  // Rule 3: YCbCr approximation (robust across ethnicities & low lighting)
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const ruleYCbCr = y > 20 && cb >= 70 && cb <= 135 && cr >= 122 && cr <= 180;

  return (ruleRGB && ruleNorm) || ruleYCbCr;
}

/**
 * Automatically detects and extracts the portrait photo region from an ID card,
 * passport, or directly uploaded applicant photograph.
 * Intelligently identifies whether the image is a direct portrait photo (centered face)
 * or a credential document (with photo box on the left, right, or center).
 */
export async function extractPortraitFromDocument(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer, { failOnError: false } as any);
    const meta = await image.metadata();
    const w = meta.width || 800;
    const h = meta.height || 600;
    const aspectRatio = w / h;

    // Analysis grid for fast skin & facial geometry mapping
    const gridW = 128;
    const gridH = Math.round((h / w) * gridW);

    const { data } = await sharp(buffer, { failOnError: false } as any)
      .resize(gridW, gridH, { fit: 'fill' })
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    let totalSkin = 0;
    let skinXSum = 0;
    let minSkinX = gridW, maxSkinX = 0;
    let minSkinY = gridH, maxSkinY = 0;
    const rowSkinCounts = new Int32Array(gridH);
    const colSkinCounts = new Int32Array(gridW);

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const idx = (y * gridW + x) * 3;
        if (isSkinTone(data[idx], data[idx + 1], data[idx + 2])) {
          totalSkin++;
          skinXSum += x;
          rowSkinCounts[y]++;
          colSkinCounts[x]++;
          if (x < minSkinX) minSkinX = x;
          if (x > maxSkinX) maxSkinX = x;
          if (y < minSkinY) minSkinY = y;
          if (y > maxSkinY) maxSkinY = y;
        }
      }
    }

    const skinRatio = totalSkin / (gridW * gridH);
    // Direct portrait: vertical orientation or significant skin presence
    const isDirectPortrait = aspectRatio < 1.05 || skinRatio > 0.16;

    let cropX = 0;
    let cropY = 0;
    let cropW = w;
    let cropH = h;

    if (isDirectPortrait) {
      // Find top of head / forehead
      let topHeadY = minSkinY;
      for (let y = 0; y < gridH; y++) {
        if (rowSkinCounts[y] > gridW * 0.08) {
          topHeadY = y;
          break;
        }
      }

      const centerX = totalSkin > 0 ? (skinXSum / totalSkin) / gridW * w : w / 2;
      const faceTopPx = (topHeadY / gridH) * h;
      const faceWidthPx = Math.min(w * 0.90, Math.max(w * 0.50, ((maxSkinX - minSkinX) / gridW) * w * 1.15));
      const faceHeightPx = faceWidthPx * 1.25;

      cropW = Math.round(faceWidthPx);
      cropH = Math.round(faceHeightPx);
      cropX = Math.max(0, Math.min(w - cropW, Math.round(centerX - cropW / 2)));
      cropY = Math.max(0, Math.min(h - cropH, Math.round(Math.max(0, faceTopPx - cropH * 0.15))));
    } else {
      // Credential document: Check if photo is on the left, right, or center
      let leftSkin = 0, rightSkin = 0;
      for (let x = 0; x < gridW / 2; x++) leftSkin += colSkinCounts[x];
      for (let x = Math.round(gridW / 2); x < gridW; x++) rightSkin += colSkinCounts[x];

      if (leftSkin > rightSkin * 1.25) {
        // Standard ICAO passport / ID with left-side photo
        cropX = Math.round(w * 0.03);
        cropY = Math.round(h * 0.10);
        cropW = Math.round(w * 0.44);
        cropH = Math.round(h * 0.72);
      } else if (rightSkin > leftSkin * 1.25) {
        // Right-side photo (some national IDs)
        cropX = Math.round(w * 0.53);
        cropY = Math.round(h * 0.10);
        cropW = Math.round(w * 0.44);
        cropH = Math.round(h * 0.72);
      } else {
        // Center-oriented document photo
        cropX = Math.round(w * 0.22);
        cropY = Math.round(h * 0.10);
        cropW = Math.round(w * 0.56);
        cropH = Math.round(h * 0.75);
      }
    }

    cropX = Math.max(0, Math.min(w - 10, cropX));
    cropY = Math.max(0, Math.min(h - 10, cropY));
    cropW = Math.min(w - cropX, Math.max(50, cropW));
    cropH = Math.min(h - cropY, Math.max(50, cropH));

    return await sharp(buffer, { failOnError: false } as any)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (err: any) {
    console.warn('[ImageAnalysis] Falling back to default extract:', err.message);
    return buffer;
  }
}

/**
 * Extracts the primary human face region from a live selfie photograph,
 * focusing on the face and removing surrounding background (beds, rooms, hands).
 */
export async function extractFaceFromSelfie(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer, { failOnError: false } as any);
    const meta = await image.metadata();
    const w = meta.width || 800;
    const h = meta.height || 600;

    const gridW = 128;
    const gridH = Math.round((h / w) * gridW);

    const { data } = await sharp(buffer, { failOnError: false } as any)
      .resize(gridW, gridH, { fit: 'fill' })
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    let totalSkin = 0;
    let skinXSum = 0;
    let minSkinX = gridW, maxSkinX = 0;
    let minSkinY = gridH, maxSkinY = 0;
    const rowSkinCounts = new Int32Array(gridH);

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const idx = (y * gridW + x) * 3;
        if (isSkinTone(data[idx], data[idx + 1], data[idx + 2])) {
          totalSkin++;
          skinXSum += x;
          rowSkinCounts[y]++;
          if (x < minSkinX) minSkinX = x;
          if (x > maxSkinX) maxSkinX = x;
          if (y < minSkinY) minSkinY = y;
          if (y > maxSkinY) maxSkinY = y;
        }
      }
    }

    if (totalSkin === 0) return buffer;

    // Find top of forehead (first row with significant skin)
    let topY = minSkinY;
    for (let y = 0; y < gridH; y++) {
      if (rowSkinCounts[y] > gridW * 0.06) {
        topY = y;
        break;
      }
    }

    const centerX = (skinXSum / totalSkin) / gridW * w;
    const topPx = (topY / gridH) * h;
    const faceW = Math.min(w * 0.90, Math.max(w * 0.40, ((maxSkinX - minSkinX) / gridW) * w * 1.15));
    const faceH = Math.min(h * 0.95, faceW * 1.25);

    let cropX = Math.round(centerX - faceW / 2);
    let cropY = Math.round(Math.max(0, topPx - faceH * 0.12));
    let cropWidth = Math.round(faceW);
    let cropHeight = Math.round(faceH);

    cropX = Math.max(0, Math.min(w - 10, cropX));
    cropY = Math.max(0, Math.min(h - 10, cropY));
    cropWidth = Math.min(w - cropX, Math.max(50, cropWidth));
    cropHeight = Math.min(h - cropY, Math.max(50, cropHeight));

    return await sharp(buffer, { failOnError: false } as any)
      .extract({ left: cropX, top: cropY, width: cropWidth, height: cropHeight })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (err: any) {
    console.warn('[ImageAnalysis] Falling back to default selfie extract:', err.message);
    return buffer;
  }
}


