import React, { useState } from 'react';
import {
  ShieldCheck,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { complianceService } from '../../services/compliance.service';
import { api } from '../../services/api';

export const PrivacyCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DSAR' | 'WITHDRAW'>('DSAR');

  // DSAR Form
  const [email, setEmail] = useState('');
  const [dsarType, setDsarType] = useState<'ACCESS' | 'DELETION'>('DELETION');
  const [reason, setReason] = useState('');
  const [dsarSubmitted, setDsarSubmitted] = useState<any>(null);
  const [dsarLoading, setDsarLoading] = useState(false);
  const [dsarError, setDsarError] = useState<string | null>(null);

  // Consent Withdrawal Form
  const [consentId, setConsentId] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawnSuccess, setWithdrawnSuccess] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const handleDsarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDsarLoading(true);
    setDsarError(null);
    try {
      const res = await complianceService.createDsar(email, dsarType, reason);
      if (res.success && res.data) {
        setDsarSubmitted(res.data);
      }
    } catch (err: any) {
      setDsarError(err.response?.data?.error?.message || 'Failed to submit privacy request.');
    } finally {
      setDsarLoading(false);
    }
  };

  const handleWithdrawConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawLoading(true);
    setWithdrawError(null);
    try {
      const res = await api.delete(`/consents/${consentId}`, { data: { reason: withdrawReason } });
      if (res.data.success) {
        setWithdrawnSuccess(true);
      }
    } catch (err: any) {
      setWithdrawError(err.response?.data?.error?.message || 'Failed to withdraw consent. Check consent ID.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4" />
          <span>Self-Service Privacy Governance</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Applicant Data Privacy Center
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Exercise your statutory data subject rights under GDPR Articles 15 & 17, CCPA, and BIPA. No mandatory staff account required.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('DSAR')}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'DSAR'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Data Access & Erasure Request (DSAR)</span>
        </button>
        <button
          onClick={() => setActiveTab('WITHDRAW')}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'WITHDRAW'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Withdraw Biometric Consent</span>
        </button>
      </div>

      {/* Tab 1: DSAR */}
      {activeTab === 'DSAR' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Submit a Data Subject Rights Request</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select whether you want to receive an export copy of your data or permanently delete all local biometric embeddings and ID photos.
            </p>
          </div>

          {dsarError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {dsarError}
            </div>
          )}

          {dsarSubmitted ? (
            <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Request Formally Logged</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your request ID is <strong>{dsarSubmitted.requestId}</strong>. A verification notice has been sent to{' '}
                <strong>{dsarSubmitted.email}</strong>. Our compliance team must execute this within the 30-day statutory SLA.
              </p>
              <button
                onClick={() => setDsarSubmitted(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleDsarSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="asha.patel@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Request Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      dsarType === 'DELETION'
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dsarType"
                      checked={dsarType === 'DELETION'}
                      onChange={() => setDsarType('DELETION')}
                      className="hidden"
                    />
                    <div className="text-xs font-bold text-slate-900">Right to Erasure (Article 17)</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Permanently purge all biometric selfies, ID photos, and personal data.
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      dsarType === 'ACCESS'
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dsarType"
                      checked={dsarType === 'ACCESS'}
                      onChange={() => setDsarType('ACCESS')}
                      className="hidden"
                    />
                    <div className="text-xs font-bold text-slate-900">Right to Access (Article 15)</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Export a machine-readable JSON copy of all held metadata and verification logs.
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Additional Context (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Account closed, withdrawing identity data..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={dsarLoading || !email.trim()}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-xs"
              >
                {dsarLoading ? <span>Logging Request...</span> : <span>Submit Privacy Request</span>}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab 2: Withdraw Consent */}
      {activeTab === 'WITHDRAW' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Withdraw Biometric Consent</h3>
            <p className="text-xs text-slate-500 mt-1">
              You may withdraw your biometric consent at any point during or following verification. Withdrawing consent halts automated pipeline processing immediately.
            </p>
          </div>

          {withdrawError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {withdrawError}
            </div>
          )}

          {withdrawnSuccess ? (
            <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">Consent Successfully Withdrawn</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your biometric consent has been officially marked as withdrawn in the immutable consent ledger. All automated processing for this case has been suspended.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWithdrawConsent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Consent Record ID or MongoDB ObjectId
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 64b8a1c90..."
                  value={consentId}
                  onChange={(e) => setConsentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Withdrawal
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prefer in-person verification"
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="font-bold">Important Notice</div>
                <p>
                  Withdrawing biometric consent will archive any in-progress verification attempt. To complete identity verification in the future, you may request an in-person or manual review path.
                </p>
              </div>

              <button
                type="submit"
                disabled={withdrawLoading || !consentId.trim()}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors shadow-xs"
              >
                {withdrawLoading ? <span>Recording Withdrawal...</span> : <span>Confirm Consent Withdrawal</span>}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
