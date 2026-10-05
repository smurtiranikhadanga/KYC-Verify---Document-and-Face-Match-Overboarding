import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Lock,
  FileText,
  UserCheck,
  Scale,
  Camera,
  ArrowRight,
  CheckCircle,
  Clock,
  EyeOff,
  Server,
  Fingerprint,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 bg-gradient-to-b from-brand-50/60 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-100/80 border border-brand-200 text-brand-800 text-xs font-semibold mb-6 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Self-Hosted &bull; AI-Assisted KYC Verification</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Verify your identity in minutes.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Privacy-first automated identity verification. Fast processing, secure document analysis, transparent biometric consent, and strict regulatory compliance.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/verify"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-lg bg-brand-600 text-white font-semibold text-base hover:bg-brand-700 shadow-md hover:shadow-lg transition-all active:scale-[0.98] space-x-2"
            >
              <span>Start Verification</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-base hover:bg-slate-50 transition-all shadow-xs"
            >
              How it Works
            </Link>
          </div>

          {/* Value Badges */}
          <div className="mt-12 pt-8 border-t border-slate-200/80 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="flex items-start space-x-3 p-3 bg-white/70 rounded-lg border border-slate-200/60 shadow-xs">
              <Clock className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">&le; 3 Min Decision</h4>
                <p className="text-[11px] text-slate-500">Real-time AI pipeline</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-white/70 rounded-lg border border-slate-200/60 shadow-xs">
              <EyeOff className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Masked by Default</h4>
                <p className="text-[11px] text-slate-500">Zero unnecessary PII leaks</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-white/70 rounded-lg border border-slate-200/60 shadow-xs">
              <Server className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Data Sovereignty</h4>
                <p className="text-[11px] text-slate-500">Self-hosted infrastructure</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-white/70 rounded-lg border border-slate-200/60 shadow-xs">
              <Scale className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Right to Erasure</h4>
                <p className="text-[11px] text-slate-500">One-click DSAR compliance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">Built for Compliance & Trust</h2>
          <h3 className="text-3xl font-bold text-slate-900">Enterprise security engineered at every layer</h3>
          <p className="mt-3 text-slate-600 text-sm">
            Strict adherence to BIPA, GDPR Article 9 explicit biometric consent, CCPA data rights, and AML statutory guidelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-300 transition-all">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Fingerprint className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Separate Written Consent</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Biometric processing is never hidden in general Terms & Conditions. Each user reviews clear retention schedules, access controls, and gives an unbundled explicit signature with SHA-256 text hashing.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-300 transition-all">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-brand-600 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Cryptographic Audit Chain</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every sensitive view, PII unmasking, decision override, or erasure action is cryptographically linked with SHA-256 block hashing into an immutable, append-only audit trail.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-300 transition-all">
            <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <UserCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Four-Eyes Human Oversight</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              High-risk overrides and automatic rejection appeals strictly enforce two-person authorization. Regular reviewers cannot unilaterally bypass automated safety signals.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Stepper Preview */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-2">Verification Journey</h2>
            <h3 className="text-3xl font-bold">How verification works in 4 simple steps</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 relative">
              <span className="text-2xl font-black text-brand-400">01</span>
              <h4 className="text-base font-bold text-white mt-2 mb-1">Contact & Consent</h4>
              <p className="text-xs text-slate-400">
                Instant OTP verification followed by granular, transparent written biometric consent.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 relative">
              <span className="text-2xl font-black text-brand-400">02</span>
              <h4 className="text-base font-bold text-white mt-2 mb-1">Document Capture</h4>
              <p className="text-xs text-slate-400">
                Upload or photograph your passport, national ID, or driver license with live quality checks.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 relative">
              <span className="text-2xl font-black text-brand-400">03</span>
              <h4 className="text-base font-bold text-white mt-2 mb-1">Selfie & Liveness</h4>
              <p className="text-xs text-slate-400">
                Brief camera preview with oval face guide and passive anti-spoofing verification.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 relative">
              <span className="text-2xl font-black text-brand-400">04</span>
              <h4 className="text-base font-bold text-white mt-2 mb-1">Instant Results</h4>
              <p className="text-xs text-slate-400">
                Automated decision generated in minutes with plain-language status tracking.
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              to="/verify"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors shadow-sm"
            >
              <span>Begin Your Verification Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Supported Documents & FAQ preview */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Over 190+ Countries Supported</h3>
            <p className="text-sm text-slate-600 mt-2 max-w-lg">
              Passports with ICAO 9303 MRZ checksums, smart national ID cards, and official driving licenses supported with instant OCR and tamper detection.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded">Passports</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded">National Identity Cards</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded">Driver Licenses</span>
            </div>
          </div>
          <Link
            to="/supported-documents"
            className="shrink-0 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-lg transition-colors"
          >
            View Document Guide &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
};
