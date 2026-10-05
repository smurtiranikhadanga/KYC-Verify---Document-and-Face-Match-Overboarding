import React, { useState, useRef } from 'react';
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
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { caseService } from '../../services/case.service';

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

  const [qualityChecked, setQualityChecked] = useState(false);
  const [qualityFeedback, setQualityFeedback] = useState<{
    resolution?: string;
    brightness?: string;
    blur?: string;
    glare?: string;
    documentEdges?: string;
    isOptimal?: boolean;
    hint?: string;
  }>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFrontSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFrontFile(file);
    setFrontPreview(previewUrl);
    setError(null);

    // Mock live quality check
    setQualityFeedback({
      resolution: 'Pass (1920x1080)',
      brightness: 'Good',
      blur: 'Low',
      glare: 'Low',
      documentEdges: 'Fully visible',
      isOptimal: true,
      hint: 'Image quality is optimal for OCR extraction.',
    });
    setQualityChecked(true);
  };

  const handleBackSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setBackFile(file);
    setBackPreview(previewUrl);
  };

  const handleContinue = async () => {
    if (!frontFile) {
      setError('Front document photo is required.');
      return;
    }
    if (docType !== 'passport' && !backFile) {
      setError('Both front and back uploads are required for National ID and Driver Licenses.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let activeCaseId = state.caseId;

      // 1. Create case if not yet created
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

      // 2. Upload document photos to server
      const uploadRes = await caseService.uploadDocuments(activeCaseId, frontFile, backFile || undefined);

      if (uploadRes.success) {
        updateState({
          country,
          documentType: docType,
          caseId: activeCaseId,
          frontFile,
          frontPreview,
          backFile,
          backPreview,
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

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
          <FileText className="w-3.5 h-3.5" />
          <span>Step 3: Document Upload</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Select and Upload Your ID
        </h2>
        <p className="text-sm text-slate-600">
          Choose your issuing country and document type. Make sure text and edges are clearly visible.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Country Selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Issuing Country / Jurisdiction
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
          <option value="GLOBAL">Other International Jurisdiction</option>
        </select>
      </div>

      {/* Document Type Cards */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">Document Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setDocType('passport')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              docType === 'passport'
                ? 'border-brand-600 bg-brand-50/40 ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <FileText className={`w-6 h-6 mb-3 ${docType === 'passport' ? 'text-brand-600' : 'text-slate-500'}`} />
            <div>
              <div className="text-xs font-bold text-slate-900">Passport</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Photo page with MRZ</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDocType('national_id')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              docType === 'national_id'
                ? 'border-brand-600 bg-brand-50/40 ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <CreditCard className={`w-6 h-6 mb-3 ${docType === 'national_id' ? 'text-brand-600' : 'text-slate-500'}`} />
            <div>
              <div className="text-xs font-bold text-slate-900">National ID</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Front & back upload</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDocType('driver_license')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              docType === 'driver_license'
                ? 'border-brand-600 bg-brand-50/40 ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <Car className={`w-6 h-6 mb-3 ${docType === 'driver_license' ? 'text-brand-600' : 'text-slate-500'}`} />
            <div>
              <div className="text-xs font-bold text-slate-900">Driver License</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Front & back upload</div>
            </div>
          </button>
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
              onClick={() => {
                setFrontFile(null);
                setFrontPreview('');
                setQualityChecked(false);
              }}
              className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium rounded">
              Front side captured
            </div>
          </div>
        ) : (
          <div
            onClick={() => frontInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFrontSelect(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-brand-50/20"
          >
            <input
              type="file"
              ref={frontInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFrontSelect(e.target.files[0])}
            />
            <UploadCloud className="w-8 h-8 text-brand-600 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-800">
              Click to select or drag & drop Front Photo
            </div>
            <div className="text-[11px] text-slate-400 mt-1">JPEG, PNG or WebP up to 10MB</div>
          </div>
        )}
      </div>

      {/* Upload Back (for National ID and Driver License) */}
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
                onClick={() => {
                  setBackFile(null);
                  setBackPreview('');
                }}
                className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium rounded">
                Back side captured
              </div>
            </div>
          ) : (
            <div
              onClick={() => backInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleBackSelect(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-brand-50/20"
            >
              <input
                type="file"
                ref={backInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleBackSelect(e.target.files[0])}
              />
              <UploadCloud className="w-8 h-8 text-brand-600 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-800">
                Click to select or drag & drop Back Photo
              </div>
              <div className="text-[11px] text-slate-400 mt-1">JPEG, PNG or WebP up to 10MB</div>
            </div>
          )}
        </div>
      )}

      {/* Live Quality Feedback Box */}
      {qualityChecked && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Image Quality Pre-Check Passed</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-emerald-900 pt-1">
            <div>Resolution: <strong className="text-emerald-700">{qualityFeedback.resolution}</strong></div>
            <div>Brightness: <strong className="text-emerald-700">{qualityFeedback.brightness}</strong></div>
            <div>Blur: <strong className="text-emerald-700">{qualityFeedback.blur}</strong></div>
            <div>Glare: <strong className="text-emerald-700">{qualityFeedback.glare}</strong></div>
          </div>
          <div className="text-[11px] text-emerald-700 italic pt-1">{qualityFeedback.hint}</div>
        </div>
      )}

      {/* Action Buttons */}
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
          disabled={loading || !frontFile || (docType !== 'passport' && !backFile)}
          className="w-2/3 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-xs"
        >
          {loading ? (
            <span>Uploading Documents...</span>
          ) : (
            <>
              <span>Continue to Selfie</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
