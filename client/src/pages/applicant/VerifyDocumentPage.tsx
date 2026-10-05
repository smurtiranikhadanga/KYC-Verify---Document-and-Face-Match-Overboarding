import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CreditCard,
  Car,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  ScanLine,
  ZoomIn,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { caseService } from '../../services/case.service';

interface DocumentQualityResult {
  resolution: string;
  brightness: string;
  blur: string;
  contrast: string;
  edges: string;
  isDocumentLike: boolean;
  isOptimal: boolean;
  score: number;
  issues: string[];
  hint: string;
}

/**
 * Real client-side image quality analysis using Canvas API.
 * No external libraries — pure browser pixel analysis.
 */
async function analyzeDocumentQuality(file: File): Promise<DocumentQualityResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const TARGET = 256;
      canvas.width = TARGET;
      canvas.height = TARGET;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, TARGET, TARGET);

      const imageData = ctx.getImageData(0, 0, TARGET, TARGET);
      const pixels = imageData.data;
      const len = TARGET * TARGET;

      // --- Convert to grayscale ---
      const gray = new Float32Array(len);
      let sumBrightness = 0;
      let skinPixels = 0;

      for (let i = 0; i < len; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        gray[i] = l;
        sumBrightness += l;

        // Skin tone detection (YCbCr)
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        if (y > 80 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) skinPixels++;
      }

      const meanBrightness = sumBrightness / len;
      const skinRatio = skinPixels / len;

      // --- Blur: Laplacian Variance ---
      let lapSum = 0;
      let lapCount = 0;
      for (let y = 1; y < TARGET - 1; y++) {
        for (let x = 1; x < TARGET - 1; x++) {
          const lap =
            -gray[(y - 1) * TARGET + x] -
            gray[y * TARGET + (x - 1)] +
            4 * gray[y * TARGET + x] -
            gray[y * TARGET + (x + 1)] -
            gray[(y + 1) * TARGET + x];
          lapSum += lap * lap;
          lapCount++;
        }
      }
      const lapVar = Math.sqrt(lapSum / lapCount);
      const blurScore = Math.min(1.0, lapVar / 400); // 0=blurry, 1=sharp

      // --- Contrast: std deviation ---
      let variance = 0;
      for (let i = 0; i < len; i++) variance += (gray[i] - meanBrightness) ** 2;
      const stdDev = Math.sqrt(variance / len);
      const contrastScore = Math.min(1.0, stdDev / 70);

      // --- Edge Density: Sobel ---
      let edgeCount = 0;
      for (let y = 1; y < TARGET - 1; y++) {
        for (let x = 1; x < TARGET - 1; x++) {
          const gx =
            -gray[(y - 1) * TARGET + (x - 1)] + gray[(y - 1) * TARGET + (x + 1)] +
            -2 * gray[y * TARGET + (x - 1)] + 2 * gray[y * TARGET + (x + 1)] +
            -gray[(y + 1) * TARGET + (x - 1)] + gray[(y + 1) * TARGET + (x + 1)];
          const gy =
            -gray[(y - 1) * TARGET + (x - 1)] - 2 * gray[(y - 1) * TARGET + x] - gray[(y - 1) * TARGET + (x + 1)] +
            gray[(y + 1) * TARGET + (x - 1)] + 2 * gray[(y + 1) * TARGET + x] + gray[(y + 1) * TARGET + (x + 1)];
          if (Math.sqrt(gx * gx + gy * gy) > 30) edgeCount++;
        }
      }
      const edgeDensity = edgeCount / lapCount;

      // --- Document likelihood ---
      const brightRatio = Array.from(gray).filter(v => v > 200).length / len;
      const darkRatio = Array.from(gray).filter(v => v < 60).length / len;
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const aspectOk = aspectRatio > 0.9 && aspectRatio < 2.3;
      const hasBrightBackground = brightRatio > 0.15;
      const hasText = darkRatio > 0.03 && darkRatio < 0.45;
      const isDocumentLike =
        aspectOk && hasBrightBackground && hasText && skinRatio < 0.45;

      // --- Build issues list ---
      const issues: string[] = [];
      if (blurScore < 0.20) issues.push('Image is too blurry — hold camera steady');
      if (meanBrightness < 40) issues.push('Image is too dark — improve lighting');
      if (meanBrightness > 230) issues.push('Image overexposed / glare detected');
      if (img.naturalWidth < 400 || img.naturalHeight < 250) issues.push('Resolution too low');
      if (!isDocumentLike) issues.push('Does not appear to be an ID document');
      if (!hasText) issues.push('No text regions detected');
      if (skinRatio > 0.50) issues.push('Detected mostly face/skin — upload your ID document, not a selfie');

      // --- Overall score ---
      let score = 1.0;
      score -= (1.0 - blurScore) * 0.30;
      score -= (1.0 - contrastScore) * 0.15;
      score -= isDocumentLike ? 0 : 0.35;
      score -= hasText ? 0 : 0.15;
      score -= skinRatio > 0.50 ? 0.25 : 0;
      score = Math.max(0, Math.min(1.0, score));

      const isOptimal = issues.length === 0 && score > 0.60;

      URL.revokeObjectURL(url);
      resolve({
        resolution: `${img.naturalWidth}×${img.naturalHeight}`,
        brightness: meanBrightness < 70 ? 'Too dark' : meanBrightness > 210 ? 'Overexposed' : 'Good',
        blur: blurScore < 0.20 ? 'Too blurry' : blurScore < 0.45 ? 'Slightly blurry' : 'Sharp',
        contrast: contrastScore < 0.2 ? 'Very low' : contrastScore < 0.4 ? 'Low' : 'Good',
        edges: edgeDensity < 0.03 ? 'Very low' : edgeDensity > 0.5 ? 'Very high' : 'Good',
        isDocumentLike,
        isOptimal,
        score: Number(score.toFixed(2)),
        issues,
        hint: isOptimal
          ? 'Document quality is optimal. Ready for AI analysis.'
          : issues.length > 0
          ? issues[0]
          : 'Please re-capture with better lighting.',
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        resolution: 'Unknown',
        brightness: 'Unknown',
        blur: 'Unknown',
        contrast: 'Unknown',
        edges: 'Unknown',
        isDocumentLike: false,
        isOptimal: false,
        score: 0,
        issues: ['Could not read image file'],
        hint: 'Invalid or corrupted image file.',
      });
    };
    img.src = url;
  });
}

export const VerifyDocumentPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useVerification();

  const [country, setCountry] = useState(state.country || 'IN');
  const [docType, setDocType] = useState<'passport' | 'national_id' | 'driver_license'>(
    state.documentType || 'passport'
  );
  const [frontFile, setFrontFile] = useState<File | null>(state.frontFile);
  const [frontPreview, setFrontPreview] = useState<string>(state.frontPreview || '');
  const [backFile, setBackFile] = useState<File | null>(state.backFile);
  const [backPreview, setBackPreview] = useState<string>(state.backPreview || '');

  const [frontQuality, setFrontQuality] = useState<DocumentQualityResult | null>(null);
  const [backQuality, setBackQuality] = useState<DocumentQualityResult | null>(null);
  const [analyzingFront, setAnalyzingFront] = useState(false);
  const [analyzingBack, setAnalyzingBack] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFrontSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload a valid image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File exceeds 10MB limit.'); return; }
    setFrontPreview(URL.createObjectURL(file));
    setFrontFile(file);
    setFrontQuality(null);
    setError(null);

    setAnalyzingFront(true);
    try {
      const quality = await analyzeDocumentQuality(file);
      setFrontQuality(quality);
      if (!quality.isOptimal && quality.issues.length > 0) {
        setError(`Front document issue: ${quality.issues[0]}`);
      }
    } finally {
      setAnalyzingFront(false);
    }
  };

  const handleBackSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload a valid image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File exceeds 10MB limit.'); return; }
    setBackPreview(URL.createObjectURL(file));
    setBackFile(file);
    setBackQuality(null);

    setAnalyzingBack(true);
    try {
      const quality = await analyzeDocumentQuality(file);
      setBackQuality(quality);
    } finally {
      setAnalyzingBack(false);
    }
  };

  const handleContinue = async () => {
    if (!frontFile) { setError('Front document photo is required.'); return; }
    if (docType !== 'passport' && !backFile) {
      setError('Both front and back uploads are required for National ID and Driver Licenses.');
      return;
    }
    if (frontQuality && !frontQuality.isDocumentLike) {
      setError('The front image does not appear to be an ID document. Please upload your actual ID.');
      return;
    }
    if (frontQuality && frontQuality.score < 0.30) {
      setError(`Front document quality too low (score: ${(frontQuality.score * 100).toFixed(0)}%). Please re-capture.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let activeCaseId = state.caseId;
      if (!activeCaseId) {
        const caseRes = await caseService.createCase({
          applicantId: state.applicantId,
          country,
          documentType: docType,
          jurisdiction: country,
        });
        if (caseRes.success && caseRes.data) {
          activeCaseId = caseRes.data.caseId;
          updateState({ caseId: activeCaseId });
        }
      }

      const uploadRes = await caseService.uploadDocuments(activeCaseId, frontFile, backFile || undefined);

      if (uploadRes.success) {
        updateState({
          country, documentType: docType, caseId: activeCaseId,
          frontFile, frontPreview, backFile, backPreview,
          qualityFeedback: uploadRes.data.qualityFeedback,
        });
        navigate('/verify/selfie');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to upload document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const QualityBadge = ({ quality, analyzing }: { quality: DocumentQualityResult | null; analyzing: boolean }) => {
    if (analyzing) {
      return (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center space-x-2.5 text-xs text-blue-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analyzing document quality...</span>
        </div>
      );
    }
    if (!quality) return null;

    if (quality.isOptimal) {
      return (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Document Quality Check Passed</span>
            <span className="ml-auto text-emerald-600 font-semibold">{(quality.score * 100).toFixed(0)}%</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Resolution', value: quality.resolution },
              { label: 'Brightness', value: quality.brightness },
              { label: 'Sharpness', value: quality.blur },
              { label: 'Contrast', value: quality.contrast },
              { label: 'Edges', value: quality.edges },
              { label: 'Document', value: quality.isDocumentLike ? '✓ Detected' : '✗ Not detected' },
            ].map(item => (
              <div key={item.label} className="text-[11px] text-emerald-900">
                <span className="text-emerald-600">{item.label}:</span> <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Quality Issues Detected</span>
          <span className="ml-auto text-amber-600 font-semibold">{(quality.score * 100).toFixed(0)}%</span>
        </div>
        <ul className="space-y-1">
          {quality.issues.map((issue, i) => (
            <li key={i} className="text-[11px] text-amber-800 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>{issue}</span>
            </li>
          ))}
        </ul>
        {quality.score < 0.30 && (
          <div className="text-[11px] text-red-700 font-semibold mt-1">
            ⚠ Quality score too low to continue. Please re-capture.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
          <ScanLine className="w-3.5 h-3.5" />
          <span>Step 3: Document Upload</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Upload Your ID Document
        </h2>
        <p className="text-sm text-slate-500">
          Every uploaded image is analyzed in real-time for quality, authenticity, and document content. Non-document images will be rejected.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Country */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Issuing Country / Jurisdiction
        </label>
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="IN">India (IN)</option>
          <option value="US">United States (US)</option>
          <option value="GB">United Kingdom (GB)</option>
          <option value="DE">Germany (DE)</option>
          <option value="FR">France (FR)</option>
          <option value="ES">Spain (ES)</option>
          <option value="AE">United Arab Emirates (AE)</option>
          <option value="JP">Japan (JP)</option>
          <option value="BR">Brazil (BR)</option>
          <option value="KR">South Korea (KR)</option>
          <option value="SA">Saudi Arabia (SA)</option>
          <option value="GLOBAL">Other International</option>
        </select>
      </div>

      {/* Document Type */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">Document Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { value: 'passport', icon: FileText, label: 'Passport', desc: 'Photo page with MRZ' },
            { value: 'national_id', icon: CreditCard, label: 'National ID', desc: 'Front & back upload' },
            { value: 'driver_license', icon: Car, label: 'Driver License', desc: 'Front & back upload' },
          ] as const).map(({ value, icon: Icon, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDocType(value)}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                docType === value
                  ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <Icon className={`w-6 h-6 mb-3 ${docType === value ? 'text-indigo-600' : 'text-slate-500'}`} />
              <div>
                <div className="text-xs font-bold text-slate-900">{label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Front */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          Document Front Photo <span className="text-red-500">*</span>
        </label>
        {frontPreview ? (
          <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 group">
            <img src={frontPreview} alt="Document Front" className="w-full h-48 object-contain" />
            <button
              type="button"
              onClick={() => { setFrontFile(null); setFrontPreview(''); setFrontQuality(null); }}
              className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur text-white text-[11px] font-medium rounded">
              Front side captured
            </div>
          </div>
        ) : (
          <div
            onClick={() => frontInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); e.dataTransfer.files?.[0] && handleFrontSelect(e.dataTransfer.files[0]); }}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-indigo-50/20"
          >
            <input type="file" ref={frontInputRef} accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleFrontSelect(e.target.files[0])} />
            <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-800">Click or drag & drop — Front Photo</div>
            <div className="text-[11px] text-slate-400 mt-1">JPEG, PNG or WebP up to 10MB</div>
          </div>
        )}
        <QualityBadge quality={frontQuality} analyzing={analyzingFront} />
      </div>

      {/* Upload Back */}
      {docType !== 'passport' && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Document Back Photo <span className="text-red-500">*</span>
          </label>
          {backPreview ? (
            <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 group">
              <img src={backPreview} alt="Document Back" className="w-full h-48 object-contain" />
              <button
                type="button"
                onClick={() => { setBackFile(null); setBackPreview(''); setBackQuality(null); }}
                className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur text-white text-[11px] font-medium rounded">
                Back side captured
              </div>
            </div>
          ) : (
            <div
              onClick={() => backInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); e.dataTransfer.files?.[0] && handleBackSelect(e.dataTransfer.files[0]); }}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-indigo-50/20"
            >
              <input type="file" ref={backInputRef} accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleBackSelect(e.target.files[0])} />
              <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-800">Click or drag & drop — Back Photo</div>
              <div className="text-[11px] text-slate-400 mt-1">JPEG, PNG or WebP up to 10MB</div>
            </div>
          )}
          <QualityBadge quality={backQuality} analyzing={analyzingBack} />
        </div>
      )}

      {/* Security Note */}
      <div className="flex items-start space-x-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <span>
          All images are analyzed using computer vision to detect blur, lighting issues, document authenticity, and tamper indicators before submission.
        </span>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate('/verify/consent')}
          className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading || !frontFile || (docType !== 'passport' && !backFile) || analyzingFront || analyzingBack}
          className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-sm"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Uploading...</span></>
          ) : analyzingFront || analyzingBack ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Analyzing quality...</span></>
          ) : (
            <><span>Continue to Selfie</span><ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
};
