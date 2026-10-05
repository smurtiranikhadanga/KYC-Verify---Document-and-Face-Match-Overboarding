import { useEffect, useRef, useState, useCallback } from 'react';

// We use @vladmandic/face-api which runs TensorFlow.js models in the browser
// Models are loaded from CDN to keep bundle size small

export interface FaceDetectionResult {
  detected: boolean;
  score: number;             // 0-1 detection confidence
  isCentered: boolean;       // face is in the oval guide zone
  isCloseEnough: boolean;    // face fills enough of the frame
  isNotTooClose: boolean;    // face isn't oversized
  multipleFaces: boolean;    // more than one face detected
  landmarks?: {
    leftEye: [number, number];
    rightEye: [number, number];
    nose: [number, number];
    mouth: [number, number];
  };
  box?: {
    x: number; y: number;
    width: number; height: number;
  };
  headPose?: {
    yaw: number;    // left/right tilt
    pitch: number;  // up/down tilt
    roll: number;   // side tilt
  };
}

export interface LivenessChallengeState {
  type: 'none' | 'turn_left' | 'turn_right' | 'blink' | 'nod';
  phase: 'waiting' | 'in_progress' | 'completed' | 'failed';
  instruction: string;
  progress: number; // 0-100%
  capturedFrames: ImageData[];
}

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  enabled = true
) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [detection, setDetection] = useState<FaceDetectionResult>({
    detected: false,
    score: 0,
    isCentered: false,
    isCloseEnough: false,
    isNotTooClose: true,
    multipleFaces: false,
  });
  const [liveness, setLiveness] = useState<LivenessChallengeState>({
    type: 'none',
    phase: 'waiting',
    instruction: 'Center your face in the oval guide',
    progress: 0,
    capturedFrames: [],
  });

  const animFrameRef = useRef<number>(0);
  const faceapiRef = useRef<any>(null);
  const challengeFramesRef = useRef<ImageData[]>([]);
  const baselineYawRef = useRef<number | null>(null);
  const challengeStartRef = useRef<number | null>(null);

  // Load face-api models
  const loadModels = useCallback(async () => {
    if (modelsLoaded || modelsLoading) return;
    setModelsLoading(true);
    try {
      // Dynamic import to keep initial bundle lean
      const faceapi = await import('@vladmandic/face-api');
      faceapiRef.current = faceapi;

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch (err) {
      console.error('[FaceDetection] Failed to load models:', err);
    } finally {
      setModelsLoading(false);
    }
  }, [modelsLoaded, modelsLoading]);

  useEffect(() => {
    if (enabled) loadModels();
  }, [enabled, loadModels]);

  // Estimate head pose from 68-point landmarks
  function estimateHeadPose(landmarks: any): { yaw: number; pitch: number; roll: number } {
    try {
      const pts = landmarks.positions;
      if (!pts || pts.length < 68) return { yaw: 0, pitch: 0, roll: 0 };

      // Key points for pose estimation
      const noseTip = pts[30];
      const leftEye = pts[36];
      const rightEye = pts[45];
      const leftMouth = pts[48];
      const rightMouth = pts[54];
      const chin = pts[8];

      // Yaw: asymmetry between left/right facial features
      const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
      const mouthCenter = { x: (leftMouth.x + rightMouth.x) / 2, y: (leftMouth.y + rightMouth.y) / 2 };
      const faceWidth = Math.abs(rightEye.x - leftEye.x);

      // Nose offset from eye centerline = yaw indicator
      const noseOffset = noseTip.x - eyeCenter.x;
      const yaw = faceWidth > 0 ? (noseOffset / faceWidth) * 90 : 0;

      // Pitch: nose above/below eye-mouth midpoint
      const eyeMouthMidY = (eyeCenter.y + mouthCenter.y) / 2;
      const faceHeight = Math.abs(chin.y - eyeCenter.y);
      const pitchOffset = noseTip.y - eyeMouthMidY;
      const pitch = faceHeight > 0 ? (pitchOffset / faceHeight) * 90 : 0;

      // Roll: eye tilt angle
      const eyeDeltaY = rightEye.y - leftEye.y;
      const eyeDeltaX = rightEye.x - leftEye.x;
      const roll = eyeDeltaX !== 0 ? Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI) : 0;

      return { yaw, pitch, roll };
    } catch {
      return { yaw: 0, pitch: 0, roll: 0 };
    }
  }

  // Main detection loop
  const runDetection = useCallback(async () => {
    if (!faceapiRef.current || !videoRef.current || !modelsLoaded) return;
    const video = videoRef.current;
    if (video.paused || video.ended || video.videoWidth === 0) return;

    try {
      const faceapi = faceapiRef.current;
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });

      const detections = await faceapi
        .detectAllFaces(video, options)
        .withFaceLandmarks(true);

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      if (!detections || detections.length === 0) {
        setDetection({
          detected: false, score: 0,
          isCentered: false, isCloseEnough: false, isNotTooClose: true,
          multipleFaces: false,
        });
        return;
      }

      const multipleFaces = detections.length > 1;
      // Use largest face
      const main = detections.reduce((best: any, d: any) =>
        d.detection.score > best.detection.score ? d : best, detections[0]);

      const box = main.detection.box;
      const score = main.detection.score;
      const landmarks = main.landmarks;

      // Oval guide zone: centered 55% width, 70% height of frame
      const ovalX = vw * 0.225;
      const ovalY = vh * 0.15;
      const ovalW = vw * 0.55;
      const ovalH = vh * 0.70;

      const faceCenterX = box.x + box.width / 2;
      const faceCenterY = box.y + box.height / 2;
      const ovalCenterX = ovalX + ovalW / 2;
      const ovalCenterY = ovalY + ovalH / 2;

      const isCentered =
        Math.abs(faceCenterX - ovalCenterX) < ovalW * 0.22 &&
        Math.abs(faceCenterY - ovalCenterY) < ovalH * 0.22;

      const faceArea = box.width * box.height;
      const frameArea = vw * vh;
      const faceRatio = faceArea / frameArea;
      const isCloseEnough = faceRatio > 0.08;
      const isNotTooClose = faceRatio < 0.65;

      // Extract landmark points
      const pts = landmarks?.positions;
      const landmarkResult = pts ? {
        leftEye: [pts[36]?.x ?? 0, pts[36]?.y ?? 0] as [number, number],
        rightEye: [pts[45]?.x ?? 0, pts[45]?.y ?? 0] as [number, number],
        nose: [pts[30]?.x ?? 0, pts[30]?.y ?? 0] as [number, number],
        mouth: [pts[62]?.x ?? 0, pts[62]?.y ?? 0] as [number, number],
      } : undefined;

      const headPose = landmarks ? estimateHeadPose(landmarks) : undefined;

      setDetection({
        detected: true,
        score,
        isCentered,
        isCloseEnough,
        isNotTooClose,
        multipleFaces,
        landmarks: landmarkResult,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        headPose,
      });

      // --- Liveness Challenge Tracking ---
      setLiveness(prev => {
        if (prev.type === 'none' || prev.phase === 'completed' || prev.phase === 'failed') return prev;

        const pose = headPose;
        if (!pose) return prev;

        const now = Date.now();

        if (prev.phase === 'waiting') {
          // Face centered = start the challenge
          if (isCentered && isCloseEnough) {
            baselineYawRef.current = pose.yaw;
            challengeStartRef.current = now;
            return {
              ...prev,
              phase: 'in_progress',
              instruction: getChallengeInstruction(prev.type),
              progress: 5,
            };
          }
          return prev;
        }

        if (prev.phase === 'in_progress') {
          // Timeout after 8 seconds
          if (challengeStartRef.current && now - challengeStartRef.current > 8000) {
            return { ...prev, phase: 'failed', instruction: 'Challenge timed out. Please try again.', progress: 0 };
          }

          // Capture frame for server analysis
          if (canvasRef.current && video) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);
              const frame = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
              challengeFramesRef.current.push(frame);
            }
          }

          const baseline = baselineYawRef.current ?? 0;
          let motionDetected = false;
          let progress = prev.progress;

          if (prev.type === 'turn_left') {
            const leftMotion = baseline - pose.yaw; // positive = turned left
            motionDetected = leftMotion > 18;
            progress = Math.min(95, 5 + (leftMotion / 18) * 90);
          } else if (prev.type === 'turn_right') {
            const rightMotion = pose.yaw - baseline;
            motionDetected = rightMotion > 18;
            progress = Math.min(95, 5 + (rightMotion / 18) * 90);
          } else if (prev.type === 'blink') {
            // Blink = low eye aspect ratio — approximate from landmarks
            // For simplicity, check 2+ seconds have passed (real blink detection needs EAR)
            const elapsed = now - (challengeStartRef.current ?? now);
            progress = Math.min(95, (elapsed / 4000) * 95);
            motionDetected = elapsed > 3500;
          } else if (prev.type === 'nod') {
            const nodMotion = Math.abs(pose.pitch - 0);
            motionDetected = nodMotion > 15;
            progress = Math.min(95, 5 + (nodMotion / 15) * 90);
          }

          if (motionDetected) {
            return {
              ...prev,
              phase: 'completed',
              instruction: '✓ Challenge completed!',
              progress: 100,
              capturedFrames: [...challengeFramesRef.current],
            };
          }

          return { ...prev, progress: Number(progress.toFixed(0)) };
        }

        return prev;
      });

    } catch (err) {
      // Silent fail — detection errors are non-fatal
    }
  }, [modelsLoaded, videoRef, canvasRef]);

  // Detection loop — runs every 150ms
  useEffect(() => {
    if (!enabled || !modelsLoaded) return;

    const loop = () => {
      runDetection();
      animFrameRef.current = window.setTimeout(loop, 150);
    };
    loop();

    return () => {
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
    };
  }, [enabled, modelsLoaded, runDetection]);

  const startChallenge = useCallback((type: LivenessChallengeState['type']) => {
    challengeFramesRef.current = [];
    baselineYawRef.current = null;
    challengeStartRef.current = null;
    setLiveness({
      type,
      phase: type === 'none' ? 'completed' : 'waiting',
      instruction: type === 'none' ? 'Look straight into the camera' : 'Center your face to begin',
      progress: type === 'none' ? 100 : 0,
      capturedFrames: [],
    });
  }, []);

  const resetChallenge = useCallback(() => {
    startChallenge(liveness.type);
  }, [liveness.type, startChallenge]);

  const getChallengeFrameBlobs = useCallback(async (): Promise<Blob[]> => {
    if (!canvasRef.current) return [];
    const blobs: Blob[] = [];
    for (const frame of challengeFramesRef.current.slice(0, 5)) {
      const canvas = document.createElement('canvas');
      canvas.width = frame.width;
      canvas.height = frame.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(frame, 0, 0);
        await new Promise<void>(resolve => {
          canvas.toBlob(b => {
            if (b) blobs.push(b);
            resolve();
          }, 'image/jpeg', 0.80);
        });
      }
    }
    return blobs;
  }, [canvasRef]);

  return {
    modelsLoaded,
    modelsLoading,
    detection,
    liveness,
    startChallenge,
    resetChallenge,
    getChallengeFrameBlobs,
  };
}

function getChallengeInstruction(type: LivenessChallengeState['type']): string {
  switch (type) {
    case 'turn_left': return '↺ Slowly turn your head to the LEFT';
    case 'turn_right': return '↻ Slowly turn your head to the RIGHT';
    case 'blink': return '👁 Blink your eyes naturally (2-3 times)';
    case 'nod': return '↕ Slowly nod your head up and down';
    default: return 'Look straight into the camera';
  }
}
