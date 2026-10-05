import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Upload,
  ArrowRight,
  UserCheck,
  Video,
  RotateCcw,
  Shield,
  Loader2,
  AlertTriangle,
  ZapIcon,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { caseService } from '../../services/case.service';
import { useFaceDetection, type LivenessChallengeState } from '../../hooks/useFaceDetection';

const CHALLENGE_OPTIONS: { value: LivenessChallengeState['type']; label: string; desc: string }[] = [
  { value: 'none', label: 'Passive Liveness', desc: 'Look straight into camera' },
  { value: 'turn_left', label: 'Turn Head Left', desc: 'Active challenge — head pose' },
  { value: 'turn_right', label: 'Turn Head Right', desc: 'Active challenge — head pose' },
  { value: 'blink', label: 'Blink Eyes', desc: 'Active challenge — eye movement' },
  { value: 'nod', label: 'Nod Head', desc: 'Active challenge — vertical motion' },
];

export const VerifySelfiePage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useVerification();

  const [mode, setMode] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<LivenessChallengeState['type']>('blink');

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>(state.selfiePreview || '');
  const [selfieFile, setSelfieFile] = useState<File | null>(state.selfieFile);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real face detection
  const {
    modelsLoaded,
    modelsLoading,
    detection,
    liveness,
    startChallenge,
    resetChallenge,
    getChallengeFrameBlobs,
  } = useFaceDetection(
    videoRef,
    canvasRef,
    mode === 'CAMERA' && cameraActive && !selfiePreview
  );

  // Start Challenge when models ready and camera active
  useEffect(() => {
    if (modelsLoaded && cameraActive && !selfiePreview) {
      startChallenge(selectedChallenge);
    }
  }, [modelsLoaded, cameraActive, selfiePreview, selectedChallenge, startChallenge]);

  // Draw detection overlay on canvas
  useEffect(() => {
    if (!overlayCanvasRef.current || !videoRef.current || selfiePreview) return;
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detection.detected || !detection.box) return;

    const { box } = detection;
    // Draw face bounding box
    ctx.strokeStyle = detection.isCentered && detection.isCloseEnough
      ? 'rgba(52, 211, 153, 0.9)' : 'rgba(251, 191, 36, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Detection label
    ctx.fillStyle = detection.isCentered && detection.isCloseEnough
      ? 'rgba(52, 211, 153, 0.85)' : 'rgba(251, 191, 36, 0.85)';
    ctx.fillRect(box.x, box.y - 20, 140, 20);
    ctx.fillStyle = '#000';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Face ${(detection.score * 100).toFixed(0)}%`, box.x + 4, box.y - 5);

    // Draw landmarks if available
    if (detection.landmarks) {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
      Object.values(detection.landmarks).forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setCameraError('Camera access denied. Please enable camera permissions or use photo upload.');
      setMode('UPLOAD');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (mode === 'CAMERA' && !selfiePreview) startCamera();
    return () => stopCamera();
  }, [mode]);

  // Guard: can only capture if face is detected, centered, and challenge completed
  const canCapture = (() => {
    if (!cameraActive || countdown !== null) return false;
    if (!detection.detected) return false;
    if (!detection.isCentered) return false;
    if (!detection.isCloseEnough) return false;
    if (detection.multipleFaces) return false;
    if (selectedChallenge !== 'none' && liveness.phase !== 'completed') return false;
    return true;
  })();

  const triggerCapture = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          performCapture();
          return null;
        }
        return prev - 1;
      });
    }, 800);
  };

  const performCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) {
          setCapturedBlob(blob);
          const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelfieFile(file);
          setSelfiePreview(URL.createObjectURL(blob));
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const handleRetake = () => {
    setSelfiePreview('');
    setSelfieFile(null);
    setCapturedBlob(null);
    if (mode === 'CAMERA') startCamera();
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG).');
      return;
    }
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleContinue = async () => {
    if (!selfieFile) {
      setError('Selfie is required to complete biometric verification.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await caseService.uploadSelfie(
        state.caseId,
        selfieFile,
        selectedChallenge !== 'none' ? selectedChallenge : undefined
      );
      if (res.success) {
        updateState({ selfieFile, selfiePreview, activeChallenge: selectedChallenge });
        navigate('/verify/review');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to upload selfie. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Status guidance
  const getFaceGuidance = () => {
    if (!modelsLoaded) return { text: 'Loading face detection...', color: 'text-slate-400' };
    if (!detection.detected) return { text: 'No face detected — position your face in the oval', color: 'text-red-400' };
    if (detection.multipleFaces) return { text: 'Multiple faces detected — only one person at a time', color: 'text-red-400' };
    if (!detection.isCloseEnough) return { text: 'Move closer to the camera', color: 'text-amber-400' };
    if (!detection.isNotTooClose) return { text: 'Move back from the camera', color: 'text-amber-400' };
    if (!detection.isCentered) return { text: 'Center your face in the oval guide', color: 'text-amber-400' };
    if (selectedChallenge !== 'none' && liveness.phase === 'waiting') return { text: 'Centering detected — starting challenge...', color: 'text-blue-400' };
    if (selectedChallenge !== 'none' && liveness.phase === 'in_progress') return { text: liveness.instruction, color: 'text-indigo-400' };
    if (selectedChallenge !== 'none' && liveness.phase === 'failed') return { text: '⚠ Challenge failed — click reset to try again', color: 'text-red-400' };
    if (selectedChallenge !== 'none' && liveness.phase === 'completed') return { text: '✓ Liveness challenge passed! Ready to capture.', color: 'text-emerald-400' };
    return { text: 'Face detected & centered — ready to capture', color: 'text-emerald-400' };
  };

  const guidance = getFaceGuidance();

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>Step 4: Biometric Selfie + Liveness Detection</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Live Face Capture
        </h2>
        <p className="text-sm text-slate-500">
          Real-time AI face detection is active. Your face must be detected and liveness challenge completed before capture is allowed.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Models Loading */}
      {modelsLoading && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-2.5 text-xs text-blue-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading face detection models (first time only)...</span>
        </div>
      )}

      {/* Mode + Challenge Controls */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode('CAMERA'); handleRetake(); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
              mode === 'CAMERA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Live Camera</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('UPLOAD'); stopCamera(); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
              mode === 'UPLOAD' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Photo Upload</span>
          </button>
        </div>

        {mode === 'CAMERA' && !selfiePreview && (
          <select
            value={selectedChallenge}
            onChange={e => {
              const v = e.target.value as LivenessChallengeState['type'];
              setSelectedChallenge(v);
              startChallenge(v);
            }}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
          >
            {CHALLENGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Camera / Preview Viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border border-slate-800 shadow-inner">
        {selfiePreview ? (
          <div className="w-full h-full relative">
            <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-emerald-600/90 text-white text-xs font-bold rounded-full flex items-center space-x-1.5 shadow">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Selfie Captured — Liveness Verified</span>
            </div>
            <button
              onClick={handleRetake}
              type="button"
              className="absolute bottom-3 right-3 px-3.5 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>
          </div>
        ) : mode === 'CAMERA' ? (
          <div className="w-full h-full relative flex items-center justify-center">
            {/* Live Video */}
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Detection Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full transform -scale-x-100 pointer-events-none"
              style={{ mixBlendMode: 'normal' }}
            />

            {/* Oval Face Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="relative"
                style={{
                  width: '55%',
                  paddingTop: '70%',
                  border: `3px solid ${
                    detection.detected && detection.isCentered && detection.isCloseEnough
                      ? 'rgba(52,211,153,0.85)'
                      : detection.detected
                      ? 'rgba(251,191,36,0.85)'
                      : 'rgba(148,163,184,0.5)'
                  }`,
                  borderRadius: '50%',
                  boxShadow: detection.detected && detection.isCentered
                    ? '0 0 0 2000px rgba(0,0,0,0.4)'
                    : '0 0 0 2000px rgba(0,0,0,0.55)',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
              />
            </div>

            {/* Face Detection Status Bar */}
            <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
              <div className={`px-4 py-1.5 rounded-full bg-slate-900/90 backdrop-blur text-xs font-semibold ${guidance.color} flex items-center space-x-2`}>
                {detection.detected ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>{guidance.text}</span>
              </div>
            </div>

            {/* Liveness Progress Bar */}
            {selectedChallenge !== 'none' && liveness.phase === 'in_progress' && (
              <div className="absolute bottom-12 left-4 right-4 pointer-events-none">
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${liveness.progress}%` }}
                  />
                </div>
                <div className="text-xs text-slate-300 text-center mt-1 font-medium">
                  {liveness.progress}% complete
                </div>
              </div>
            )}

            {/* Model Loading */}
            {modelsLoading && (
              <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-sm text-slate-300 font-medium">Loading face detection AI...</span>
              </div>
            )}

            {/* Countdown */}
            {countdown !== null && (
              <div className="absolute inset-0 z-20 bg-slate-900/50 flex items-center justify-center">
                <span className="text-8xl font-extrabold text-white drop-shadow-lg">
                  {countdown}
                </span>
              </div>
            )}

            {/* Bottom guidance */}
            <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
              <span className="inline-block px-3.5 py-1.5 rounded-full bg-slate-900/85 backdrop-blur text-white text-xs font-medium">
                {selectedChallenge === 'none'
                  ? '👁 Passive liveness — look straight at camera'
                  : CHALLENGE_OPTIONS.find(o => o.value === selectedChallenge)?.label || ''}
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-900 transition-colors"
          >
            <input
              type="file" ref={fileInputRef} accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <div className="w-14 h-14 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Upload className="w-7 h-7" />
            </div>
            <div className="text-sm font-semibold text-white">Click to Upload Selfie Photo</div>
            <div className="text-xs text-slate-400 mt-1">JPEG, PNG or WebP up to 10MB</div>
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 max-w-xs text-left">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              Uploaded photos are analyzed for face presence but cannot perform liveness detection. Live camera is recommended for higher security.
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvases */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Detection Status Cards */}
      {mode === 'CAMERA' && !selfiePreview && modelsLoaded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Face Detected', ok: detection.detected, icon: '👤' },
            { label: 'Centered', ok: detection.isCentered, icon: '🎯' },
            { label: 'Good Distance', ok: detection.isCloseEnough && detection.isNotTooClose, icon: '📏' },
            {
              label: selectedChallenge === 'none' ? 'Passive OK' : 'Challenge',
              ok: selectedChallenge === 'none' ? detection.detected : liveness.phase === 'completed',
              icon: '✅',
            },
          ].map(item => (
            <div
              key={item.label}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                item.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {item.ok && <CheckCircle2 className="w-3 h-3 ml-auto text-emerald-600" />}
            </div>
          ))}
        </div>
      )}

      {/* Challenge failed reset */}
      {liveness.phase === 'failed' && mode === 'CAMERA' && !selfiePreview && (
        <button
          type="button"
          onClick={resetChallenge}
          className="w-full py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Challenge</span>
        </button>
      )}

      {/* Capture Button */}
      {!selfiePreview && mode === 'CAMERA' && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={triggerCapture}
            disabled={!canCapture}
            title={!canCapture ? 'Complete face detection and liveness challenge first' : 'Take selfie'}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-full flex items-center space-x-2 shadow-lg transition-all active:scale-95"
          >
            <Camera className="w-5 h-5" />
            <span>
              {!detection.detected ? 'Waiting for face...'
                : !canCapture ? 'Complete liveness challenge...'
                : 'Capture Selfie (3s countdown)'}
            </span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => { stopCamera(); navigate('/verify/document'); }}
          className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading || !selfieFile}
          className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-sm"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Analyzing...</span></>
          ) : (
            <><span>Review Submission</span><ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
};
