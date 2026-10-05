import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Shield, Lock, Check } from 'lucide-react';
import { useVerification } from '../context/VerificationContext';

export const ApplicantLayout: React.FC = () => {
  const location = useLocation();
  const { state } = useVerification();

  const steps = [
    { id: 'contact', path: '/verify/contact', label: 'Contact' },
    { id: 'consent', path: '/verify/consent', label: 'Consent' },
    { id: 'document', path: '/verify/document', label: 'Document' },
    { id: 'selfie', path: '/verify/selfie', label: 'Selfie' },
    { id: 'review', path: '/verify/review', label: 'Review' },
  ];

  const currentStepIndex = steps.findIndex((s) => location.pathname.startsWith(s.path));
  const isStatusPage = location.pathname.includes('/verify/status');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">KYC-Flow</span>
          </Link>

          <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-brand-600" />
            <span>Encrypted Session: {state.caseId ? state.caseId : 'New Verification'}</span>
          </div>

          <Link
            to="/privacy-center"
            className="text-xs text-slate-600 hover:text-brand-600 font-medium transition-colors"
          >
            Privacy Rights
          </Link>
        </div>

        {/* Stepper Navigation (only shown during onboarding, not on final status) */}
        {!isStatusPage && (
          <div className="max-w-3xl mx-auto mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : isCurrent
                            ? 'bg-brand-600 text-white ring-4 ring-brand-100 shadow-xs'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[11px] mt-1.5 font-medium hidden sm:block ${
                          isCurrent ? 'text-brand-600 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 transition-all ${
                          idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Form Content */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Trust Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Your biometric data is processed strictly for identity verification.</span>
          <div className="flex space-x-3">
            <Link to="/privacy" className="hover:text-slate-600 transition-colors">Privacy Notice</Link>
            <span>&bull;</span>
            <Link to="/privacy-center" className="hover:text-slate-600 transition-colors">Withdraw Consent</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
