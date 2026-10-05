import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Shield, Lock, FileCheck, CheckCircle2 } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  const location = useLocation();

  const navLinks = [
    { label: 'How it Works', path: '/how-it-works' },
    { label: 'Supported Documents', path: '/supported-documents' },
    { label: 'Privacy & Consent', path: '/privacy' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Contact & DSAR', path: '/contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Banner for Data Sovereignty */}
      <div className="bg-brand-900 text-white text-xs py-2 px-4 flex items-center justify-between border-b border-brand-800">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium">Self-Hosted Sovereign Identity Platform</span>
            <span className="text-brand-300 hidden md:inline">| Zero third-party biometric sharing</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/privacy-center" className="hover:text-brand-200 transition-colors underline">
              Data Privacy Center
            </Link>
            <Link to="/staff/login" className="hover:text-brand-200 font-medium transition-colors">
              Staff Portal &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:bg-brand-700 transition-colors">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">KYC-Flow</span>
              <span className="text-xs block font-medium text-brand-600 -mt-1">Identity & Compliance</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors hover:text-brand-600 ${
                  location.pathname === link.path ? 'text-brand-600 font-semibold' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            <Link
              to="/verify"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition-all shadow-sm hover:shadow active:scale-[0.98]"
            >
              Start Verification
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center space-x-2 text-white">
                <Shield className="w-6 h-6 text-brand-400" />
                <span className="font-bold text-lg">KYC-Flow</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enterprise AI-assisted KYC verification and regulatory compliance platform. Built for privacy, speed, and statutory audit integrity.
              </p>
              <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>GDPR, CCPA & AML Compliant</span>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Verification</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/verify" className="hover:text-white transition-colors">Start Identity Flow</Link></li>
                <li><Link to="/supported-documents" className="hover:text-white transition-colors">Supported IDs & Passports</Link></li>
                <li><Link to="/how-it-works" className="hover:text-white transition-colors">Biometric Liveness Verification</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Privacy & Rights</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Biometric Consent Notice</Link></li>
                <li><Link to="/privacy-center" className="hover:text-white transition-colors">Data Subject Requests (DSAR)</Link></li>
                <li><Link to="/privacy-center" className="hover:text-white transition-colors">Withdraw Consent</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Retention & Purge Schedule</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Operations</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/staff/login" className="hover:text-white transition-colors">Staff Reviewer Console</Link></li>
                <li><Link to="/staff/compliance" className="hover:text-white transition-colors">Compliance Officer Portal</Link></li>
                <li><Link to="/staff/mlops" className="hover:text-white transition-colors">MLOps & Model Registry</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs">
            <p>&copy; 2026 KYC-Flow Platform. Production MVP Architecture. All rights reserved.</p>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <span className="flex items-center space-x-1 text-slate-500">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>AES-256 / SHA-256 Chain</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-500">
                <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>BIPA / Article 9 GDPR Compliant</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
