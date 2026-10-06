import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, ArrowRight, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';

export const VerifyContactPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useVerification();
  const { setAuthData } = useAuth();

  const [contactType, setContactType] = useState<'email' | 'phone'>(state.contactType || 'email');
  const [contactValue, setContactValue] = useState(state.contactValue || '');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(state.sessionId || '');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.requestOtp(contactType, contactValue);
      if (res.success && res.data) {
        const receivedSessionId = res.data.sessionId;
        const validCode = res.data.devOtp || '123456';

        setSessionId(receivedSessionId);
        setDevOtp(validCode);
        setOtpCode(validCode);

        updateState({
          contactType,
          contactValue,
          sessionId: receivedSessionId,
        });

        setStep('VERIFY');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const activeSessionId = sessionId || state.sessionId;
    if (!activeSessionId) {
      setError('Verification session not found. Please request a new code.');
      setStep('REQUEST');
      setLoading(false);
      return;
    }

    try {
      const res = await authService.verifyOtp(activeSessionId, otpCode);
      if (res.success && res.data) {
        setAuthData(res.data.token, { id: res.data.applicantId, role: 'applicant' });
        updateState({
          applicantId: res.data.applicantId,
          caseId: res.data.currentCaseId || '',
          sessionId: activeSessionId,
        });
        navigate('/verify/consent');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid OTP code. Please try again or use the code shown above.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Step 1: Contact Authentication</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Verify Your Contact Information
        </h2>
        <p className="text-sm text-slate-600">
          We need to securely verify your email or mobile number to associate your verification session and send decision updates.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === 'REQUEST' ? (
        <form onSubmit={handleRequestOtp} className="space-y-5">
          {/* Toggle Email vs Phone */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setContactType('email');
                setContactValue('');
              }}
              className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center space-x-2 transition-all ${
                contactType === 'email' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Address</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setContactType('phone');
                setContactValue('');
              }}
              className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center space-x-2 transition-all ${
                contactType === 'phone' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile Phone</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {contactType === 'email' ? 'Your Email Address' : 'Your Phone Number'}
            </label>
            <input
              type={contactType === 'email' ? 'email' : 'tel'}
              required
              placeholder={contactType === 'email' ? 'asha.patel@example.com' : '+1 555 123 4567'}
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !contactValue.trim()}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-xs"
          >
            {loading ? (
              <span>Sending Code...</span>
            ) : (
              <>
                <span>Send Verification Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          {/* Dev Helper Callout */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3">
            <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <div className="font-bold">Development OTP Environment</div>
              <div>
                Verification code sent to <strong>{contactValue}</strong>.
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <span className="font-mono bg-white px-2.5 py-1 rounded border border-amber-300 inline-block text-sm font-bold text-amber-900">
                  Development OTP: {devOtp || '123456'}
                </span>
                <button
                  type="button"
                  onClick={() => setOtpCode(devOtp || '123456')}
                  className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-2.5 py-1 rounded font-semibold transition-colors"
                >
                  Fill Code
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Enter 6-Digit Verification Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3.5 py-2.5 text-center text-lg tracking-widest font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('REQUEST')}
              className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
            >
              Change Contact
            </button>
            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-2/3 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-xs"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Confirm & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
