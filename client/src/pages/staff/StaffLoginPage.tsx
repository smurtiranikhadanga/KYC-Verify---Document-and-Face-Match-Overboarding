import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, UserCheck, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const StaffLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/staff/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setLoading(true);
    setError(null);

    try {
      const res = await login(demoEmail, 'Password123!');
      if (res.success) {
        navigate('/staff/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Reviewer', email: 'reviewer@kycflow.dev', desc: 'Case review & queue actions' },
    { role: 'Senior Reviewer', email: 'senior@kycflow.dev', desc: 'Four-eyes overrides & PII reveal' },
    { role: 'Compliance Officer', email: 'compliance@kycflow.dev', desc: 'Consent ledger & DSAR erasure' },
    { role: 'Administrator', email: 'admin@kycflow.dev', desc: 'User & policy management' },
    { role: 'ML Engineer', email: 'ml@kycflow.dev', desc: 'Model registry & drift metrics' },
    { role: 'Auditor', email: 'auditor@kycflow.dev', desc: 'Read-only immutable logs' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-brand-500/20">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          KYC-Flow Staff Portal
        </h2>
        <p className="text-xs text-slate-400">
          Role-Based Access Control &bull; OIDC/SSO Ready Architecture
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-slate-800/90 border border-slate-700/80 p-8 rounded-2xl shadow-xl space-y-6">
          {error && (
            <div className="p-3.5 bg-red-900/30 border border-red-500/40 rounded-lg flex items-start space-x-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Login Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-brand-400" />
                <span>Instant Demo Login (One-Click)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Password: Password123!</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={loading}
                  className="p-2.5 bg-slate-700/60 hover:bg-brand-600/30 border border-slate-600/70 hover:border-brand-500 rounded-lg text-left transition-all group disabled:opacity-50"
                >
                  <div className="text-xs font-bold text-white group-hover:text-brand-300 truncate">
                    {acc.role}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{acc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase font-medium">Or Sign In with Email</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="reviewer@kycflow.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Staff Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-400">
            Note: In production enterprise environments, this authenticates via Keycloak / Okta SAML SSO with multi-factor authentication (MFA).
          </div>
        </div>
      </div>
    </div>
  );
};
