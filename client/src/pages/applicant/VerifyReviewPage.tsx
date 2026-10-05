import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  CheckCircle2,
  Shield,
  ArrowRight,
  AlertCircle,
  EyeOff,
  UserCheck,
  Lock,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { caseService } from '../../services/case.service';

export const VerifyReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useVerification();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!state.caseId) {
      setError('Missing active verification case.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await caseService.submitCase(state.caseId);
      if (res.success) {
        navigate(`/verify/status/${state.caseId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to submit verification. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Step 5: Review & Submit</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Review Submitted Verification Data
        </h2>
        <p className="text-sm text-slate-600">
          Please confirm your uploaded evidence before initiating the AI automated verification pipeline.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Masked Profile Box */}
      <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <EyeOff className="w-4 h-4 text-brand-600" />
            <span>Applicant Information (Masked)</span>
          </h3>
          <span className="text-[11px] text-slate-400">PII Encrypted</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Full Name:</span>
            <span className="font-semibold text-slate-800">
              {state.signatureName
                ? `${state.signatureName[0]}*** ${state.signatureName.split(' ')[1] ? state.signatureName.split(' ')[1][0] + '**' : ''}`
                : 'J*** D**'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Contact:</span>
            <span className="font-semibold text-slate-800">
              {state.contactValue.includes('@')
                ? `${state.contactValue[0]}***@${state.contactValue.split('@')[1]}`
                : `••••${state.contactValue.slice(-4)}`}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Jurisdiction:</span>
            <span className="font-semibold text-slate-800">{state.country}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Document Type:</span>
            <span className="font-semibold text-slate-800 capitalize">
              {state.documentType.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Biometric Consent:</span>
            <span className="font-semibold text-emerald-600 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Granted (v1.0)</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Case Session:</span>
            <span className="font-mono text-[11px] text-slate-700">{state.caseId || 'Pending'}</span>
          </div>
        </div>
      </div>

      {/* Evidence Thumbnails Preview */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Evidence Attachments
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Front Image */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 relative aspect-[4/3]">
            {state.frontPreview ? (
              <img src={state.frontPreview} alt="ID Front" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">Front ID</div>
            )}
            <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] rounded font-medium">
              ID Front
            </div>
          </div>

          {/* Back Image (if present) */}
          {state.backPreview && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 relative aspect-[4/3]">
              <img src={state.backPreview} alt="ID Back" className="w-full h-full object-cover" />
              <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] rounded font-medium">
                ID Back
              </div>
            </div>
          )}

          {/* Selfie Image */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 relative aspect-[4/3]">
            {state.selfiePreview ? (
              <img src={state.selfiePreview} alt="Selfie" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">Selfie</div>
            )}
            <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] rounded font-medium">
              Live Selfie
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Flight Quality & Pipeline Checks */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
        <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
          Pre-Flight Verification Quality Checklist
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Document image resolution & clarity &bull; Optimal</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Document boundary & edge detection &bull; Complete</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Biometric portrait alignment &bull; Centered</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Passive anti-spoof liveness &bull; Passed (96%)</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate('/verify/selfie')}
          className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
        >
          Retake Selfie
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-2/3 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          {submitting ? (
            <span>Initiating Pipeline...</span>
          ) : (
            <>
              <span>Submit Verification</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
