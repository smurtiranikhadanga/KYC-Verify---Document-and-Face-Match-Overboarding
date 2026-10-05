import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileCheck, Lock, Trash2, Scale, ArrowRight } from 'lucide-react';

export const PrivacyNoticePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4" />
          <span>Biometric & Data Privacy Policy (v1.0)</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Biometric Information & Data Privacy Notice
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Effective Date: October 2026 &bull; Formulated under GDPR (Articles 9 & 17), BIPA (740 ILCS 14/), and CCPA.
        </p>
      </div>

      <div className="prose prose-slate max-w-none text-sm space-y-8 text-slate-700 leading-relaxed">
        <section className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-brand-600" />
            <span>1. What Biometric & Personal Information We Collect</span>
          </h2>
          <p>
            When you participate in identity verification on KYC-Flow, we collect:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Facial Biometric Data:</strong> Digital representations of facial geometry extracted from your government ID photograph and your live captured selfie/video frame.</li>
            <li><strong>Document Imagery:</strong> Full-resolution photographic captures of your passport, national identity card, or driver license (front and back).</li>
            <li><strong>Extracted Text & Metadata:</strong> Full name, date of birth, document number, expiration date, issuing country, and machine-readable zone (MRZ) characters.</li>
            <li><strong>Telemetry & Session Proof:</strong> Time of consent, IP address hash, browser user-agent hash, and digital signature acknowledgment.</li>
          </ul>
        </section>

        <section className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Scale className="w-4 h-4 text-brand-600" />
            <span>2. Purpose & Legal Basis of Processing</span>
          </h2>
          <p>
            We process your biometric data exclusively for the purpose of verifying that the person submitting the verification is the legitimate owner of the government identity document presented, and to prevent synthetic identity theft or presentation attacks.
          </p>
          <p className="text-xs text-slate-500">
            <strong>Lawful Basis:</strong> Explicit, separate written consent under Article 9(2)(a) GDPR, and compliance with statutory Anti-Money Laundering (AML) and Counter-Terrorism Financing obligations under applicable financial service laws.
          </p>
        </section>

        <section className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-brand-600" />
            <span>3. Retention Schedules & Automatic Purging</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-slate-900 border-b">Data Category</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-900 border-b">Retention Period</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-900 border-b">Action Upon Expiration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-2 font-medium">Raw Selfie & Biometric Embeddings</td>
                  <td className="px-3 py-2">30 Days post-decision (or upon consent withdrawal)</td>
                  <td className="px-3 py-2 text-red-600 font-medium">Permanent Cryptographic Eradication</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">Document Images & Extracted PII</td>
                  <td className="px-3 py-2">5 Years (Statutory AML Record-Keeping)</td>
                  <td className="px-3 py-2 text-slate-600">Pseudonymized / Archived</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">Audit Logs & Consent Ledger</td>
                  <td className="px-3 py-2">7 Years (Immutable Accountability)</td>
                  <td className="px-3 py-2 text-slate-600">Cryptographic Cold Archive</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Trash2 className="w-4 h-4 text-brand-600" />
            <span>4. Your Data Subject Rights (DSAR)</span>
          </h2>
          <p>
            You have the right to request a complete machine-readable copy of your personal data, withdraw your biometric consent at any time, or request the immediate erasure of your records.
          </p>
          <div className="pt-2">
            <Link
              to="/privacy-center"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              <span>Visit Privacy Center & Submit DSAR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
