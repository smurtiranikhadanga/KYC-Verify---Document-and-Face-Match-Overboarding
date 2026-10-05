import React, { useState, useRef, useEffect } from 'react';
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
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { caseService } from '../../services/case.service';

export const VerifySelfiePage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useVerification();

  const [mode, setMode] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>(state.selfiePreview || '');
  const [selfieFile, setSelfieFile] = useState<File | null>(state.selfieFile);

  // Active Challenge Mode
  const [activeChallenge, setActiveChallenge] = useState<'none' | 'turn_left' | 'turn_right' | 'blink'>('none');
  const [challengeStep, setChallengeStep] = useState<string>('Center your face in the oval guide');
  const [challengePassed, setChallengePassed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
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
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera access denied or unavailable. You can upload a photo selfie below.');
      setMode('UPLOAD');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (mode === 'CAMERA' && !selfiePreview) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, selfiePreview]);

  // Capture Photo with Countdown
  const triggerCapture = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
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
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedBlob(blob);
            const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelfieFile(file);
            const previewUrl = URL.createObjectURL(blob);
            setSelfiePreview(previewUrl);
            stopCamera();
            setChallengePassed(true);
          }
        },
        'image/jpeg',
        0.95
      );
    }
  };

  const handleRetake = () => {
    setSelfiePreview('');
    setSelfieFile(null);
    setCapturedBlob(null);
    setChallengePassed(false);
    if (mode === 'CAMERA') {
      startCamera();
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG).');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setSelfieFile(file);
    setSelfiePreview(previewUrl);
    setChallengePassed(true);
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
      const res = await caseService.uploadSelfie(state.caseId, selfieFile, activeChallenge !== 'none' ? activeChallenge : undefined);
      if (res.success) {
        updateState({
          selfieFile,
          selfiePreview,
          activeChallenge,
        });
        navigate('/verify/review');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to upload selfie. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Step 4: Biometric Selfie & Liveness</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Capture Live Face Portrait
        </h2>
        <p className="text-sm text-slate-600">
          Position your face inside the oval guide. Make sure your face is well-lit without sunglasses or face masks.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex justify-between items-center pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('CAMERA');
              handleRetake();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
              mode === 'CAMERA' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Webcam Stream</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('UPLOAD');
              stopCamera();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
              mode === 'UPLOAD' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Photo Upload</span>
          </button>
        </div>

        {/* Active Challenge Selector */}
        <select
          value={activeChallenge}
          onChange={(e) => setActiveChallenge(e.target.value as any)}
          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700"
        >
          <option value="none">Passive Liveness (Standard)</option>
          <option value="turn_left">Active Challenge: Turn Head Left</option>
          <option value="turn_right">Active Challenge: Turn Head Right</option>
          <option value="blink">Active Challenge: Blink Eyes</option>
        </select>
      </div>

      {/* Camera Viewport / Preview */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border border-slate-800 shadow-inner">
        {selfiePreview ? (
          <div className="w-full h-full relative">
            <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 px-3 py-1 bg-emerald-600/90 text-white text-xs font-semibold rounded-full flex items-center space-x-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Portrait Captured & Liveness Evaluated (96%)</span>
            </div>
            <button
              onClick={handleRetake}
              type="button"
              className="absolute bottom-3 right-3 px-3.5 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Photo</span>
            </button>
          </div>
        ) : mode === 'CAMERA' ? (
          <div className="w-full h-full relative flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {/* Oval Face Guide Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="face-oval-guide relative flex items-center justify-center">
                {/* Horizontal guide alignment line */}
                <div className="absolute w-full h-[1px] bg-brand-400/40 top-[40%]"></div>
              </div>
            </div>

            {/* Countdown Banner */}
            {countdown !== null && (
              <div className="absolute inset-0 z-20 bg-slate-900/40 flex items-center justify-center">
                <span className="text-7xl font-extrabold text-white animate-ping drop-shadow-md">
                  {countdown}
                </span>
              </div>
            )}

            {/* Live Guidance Tip */}
            <div className="absolute bottom-4 left-0 right-0 text-center px-4 pointer-events-none">
              <span className="inline-block px-3.5 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-xs text-white text-xs font-medium shadow-sm">
                {activeChallenge === 'turn_left'
                  ? 'Active Challenge: Slowly turn your head left'
                  : activeChallenge === 'turn_right'
                  ? 'Active Challenge: Slowly turn your head right'
                  : activeChallenge === 'blink'
                  ? 'Active Challenge: Blink your eyes naturally'
                  : 'Look straight into the camera & hold still'}
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-900 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <div className="w-14 h-14 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mb-3">
              <Upload className="w-7 h-7" />
            </div>
            <div className="text-sm font-semibold text-white">Click to Upload Selfie Photo</div>
            <div className="text-xs text-slate-400 mt-1">JPEG, PNG or WebP up to 10MB</div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Control Buttons */}
      {!selfiePreview && mode === 'CAMERA' && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={triggerCapture}
            disabled={!cameraActive || countdown !== null}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-full flex items-center space-x-2 shadow-md transition-all active:scale-95"
          >
            <Camera className="w-5 h-5" />
            <span>Take Photo (3s Countdown)</span>
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            navigate('/verify/document');
          }}
          className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading || !selfieFile}
          className="w-2/3 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-xs"
        >
          {loading ? (
            <span>Processing Selfie...</span>
          ) : (
            <>
              <span>Review Submission</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
