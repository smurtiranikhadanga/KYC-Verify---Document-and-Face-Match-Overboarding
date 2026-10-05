import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Fingerprint, Lock, Scale, AlertTriangle, ArrowRight, XCircle } from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { api } from '../../services/api';

export const VerifyConsentPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useVerification();

  const [consentCheckbox, setConsentCheckbox] = useState(state.consentGranted || false);
  const [signatureName, setSignatureName] = useState(state.signatureName || '');
  const [loading, setLoading] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consentText = `I explicitly consent to biometric processing and automated facial verification. I authorize KYC-Flow to extract facial geometry measurements from my government-issued photo identity document and live selfie for the purpose of identity verification and fraud prevention in accordance with BIPA (740 ILCS 14/) and GDPR Article 9. I understand my biometric data will be purged within 30 days post-decision and that I may withdraw this consent at any time via the Privacy Center.`;

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentCheckbox) {
      setError('You must check the explicit biometric consent box to proceed.');
      return;
    }
    if (!signatureName.trim()) {
      setError('Please type your legal full name as digital signature acknowledgment.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Record consent on the backend
      const res = await api.post('/consents', {
        applicantId: state.applicantId,
        type: 'biometric',
        policyVersion: 1,
        granted: true,
        signatureName: signatureName.trim(),
        consentText,
      });

      if (res.data.success) {
        updateState({
          consentGranted: true,
          signatureName: signatureName.trim(),
        });
        navigate('/verify/document');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to record consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
          <Fingerprint className="w-3.5 h-3.5" />
          <span>Step 2: Explicit Biometric Consent</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Biometric Data Processing Agreement
        </h2>
        <p className="text-sm text-slate-600">
          In compliance with international biometric privacy legislation, biometric processing requires your separate, explicit written consent.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Disclosures Box */}
      <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs text-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="font-bold text-slate-900 flex items-center space-x-1">
              <Fingerprint className="w-3.5 h-3.5 text-brand-600" />
              <span>What is Collected:</span>
            </span>
            <p className="text-slate-500">
              Facial geometry vectors and photo comparison embeddings from your ID and selfie.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-900 flex items-center space-x-1">
              <Scale className="w-3.5 h-3.5 text-brand-600" />
              <span>Why it is Used:</span>
            </span>
            <p className="text-slate-500">
              Strictly to confirm that the person presenting the document matches the ID photo.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-900 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-brand-600" />
              <span>Retention Period:</span>
            </span>
            <p className="text-slate-500">
              Biometric embeddings are permanently purged within 30 days post-decision.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-900 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              <span>Who Accesses It:</span>
            </span>
            <p className="text-slate-500">
              Automated neural network models and authorized compliance reviewers only.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Version: 1.0 &bull; Hash: SHA-256 Hashed Record</span>
          <Link to="/privacy" target="_blank" className="text-brand-600 hover:underline font-medium">
            Read Full Privacy Notice &rarr;
          </Link>
        </div>
      </div>

      {/* Form with Checkbox and Signature */}
      <form onSubmit={handleContinue} className="space-y-5">
        <label className="flex items-start space-x-3 p-4 bg-brand-50/50 rounded-xl border border-brand-200/70 cursor-pointer hover:bg-brand-50 transition-colors">
          <input
            type="checkbox"
            checked={consentCheckbox}
            onChange={(e) => setConsentCheckbox(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-xs text-slate-800 leading-relaxed font-medium">
            I explicitly consent to biometric processing and automated facial verification for identity verification under applicable privacy laws.
          </span>
        </label>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Digital Signature (Type your legal full name)
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Jane Doe"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-serif italic text-slate-800"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowDeclineModal(true)}
            className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
          >
            Decline
          </button>
          <button
            type="submit"
            disabled={loading || !consentCheckbox || !signatureName.trim()}
            className="w-2/3 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-xs"
          >
            {loading ? (
              <span>Recording Consent...</span>
            ) : (
              <>
                <span>Agree & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Decline Modal - Alternative Manual Path (no dark patterns) */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Alternative Verification Path</h3>
              <p className="text-xs text-slate-600">
                You have the full right to decline biometric processing without penalty.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
              <p>
                <strong>Manual Review Option:</strong> If you decline automated biometric verification, you can verify in-person or via live video call with a compliance officer by submitting certified physical copies.
              </p>
              <p>
                Average manual processing turnaround: <strong>3 to 5 business days</strong>.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Back to Consent
              </button>
              <Link
                to="/contact"
                className="w-1/2 py-2 bg-slate-900 hover:bg-slate-800 text-white text-center font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <span>Request Manual</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
