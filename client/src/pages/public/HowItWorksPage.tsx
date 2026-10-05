import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Eye, ScanLine, UserCheck, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          How KYC-Flow Verifies Your Identity
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Our automated pipeline combines advanced computer vision, OCR text extraction, facial biometric matching, and passive anti-spoofing to complete verification securely in minutes.
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1 */}
        <div className="flex flex-col md:flex-row items-start gap-6 p-6 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 font-bold text-lg">
            1
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Separate Biometric Consent Capture</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Before any camera is activated or any image is processed, we present a separate, granular biometric consent notice. You will see exactly which data points are collected, how they will be used, retention periods, and who can access them. The signed consent agreement is preserved in an immutable, cryptographically hashed ledger.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-600 font-semibold pt-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Compliant with BIPA & Article 9 GDPR standards</span>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col md:flex-row items-start gap-6 p-6 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-lg">
            2
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Document Preprocessing & OCR Extraction</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              When you upload or snap your ID front and back, our pre-processing engine automatically checks for blur, glare, lighting, and cropped edges. High-accuracy OCR extracts your full name, date of birth, ID number, and expiration date while validating ICAO 9303 Machine Readable Zone (MRZ) checksums.
            </p>
            <div className="flex items-center space-x-2 text-xs text-brand-600 font-semibold pt-1">
              <ScanLine className="w-4 h-4" />
              <span>Live feedback helps you capture clear, glare-free photos</span>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col md:flex-row items-start gap-6 p-6 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 font-bold text-lg">
            3
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Biometric Face Matching & Anti-Spoof Liveness</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              A quick selfie capture compares the portrait extracted from your physical ID with your live facial embedding. Advanced passive neural network classifiers detect 2D print attacks, screen replays, and silicone masks without making you perform complex gestures. If ambiguity is detected, an optional active challenge (e.g. slight head turn) is triggered.
            </p>
            <div className="flex items-center space-x-2 text-xs text-purple-600 font-semibold pt-1">
              <UserCheck className="w-4 h-4" />
              <span>Cosine embedding similarity calibrated to target FMR &le; 1e-5</span>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex flex-col md:flex-row items-start gap-6 p-6 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-lg">
            4
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Automated Decision Engine & Review Escalation</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Our policy rules engine evaluates risk scores against jurisdiction thresholds. Genuine applicants receive instant Auto-Approval. If lighting was insufficient, the applicant receives a plain-language prompt to retake the photo. Edge cases are routed directly to trained compliance reviewers in a prioritized queue.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-600 font-semibold pt-1">
              <Shield className="w-4 h-4" />
              <span>Human-in-the-loop oversight with role-based field masking</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-6">
        <Link
          to="/verify"
          className="inline-flex items-center space-x-2 px-8 py-3.5 bg-brand-600 text-white font-semibold text-sm rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
        >
          <span>Start Identity Verification</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
