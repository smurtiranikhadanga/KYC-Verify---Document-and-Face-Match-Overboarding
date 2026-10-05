import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CreditCard, Car, Check, Search, Globe, ArrowRight } from 'lucide-react';

export const SupportedDocumentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const docTypes = [
    {
      type: 'International Passports',
      icon: FileText,
      description: 'Standard biometric and machine-readable passports complying with ICAO Doc 9303.',
      requirements: ['Valid expiration date', 'Visible 2-line or 3-line MRZ zone', 'No glare over photograph', 'Full data page captured'],
      countries: ['India', 'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Japan', 'United Arab Emirates', 'Saudi Arabia', 'Brazil', 'South Korea', 'Canada', 'Australia', 'All 190+ ICAO Member States'],
    },
    {
      type: 'National Identity Cards',
      icon: CreditCard,
      description: 'Government-issued smart cards, citizen identity cards, and resident permits.',
      requirements: ['Both front and back uploads required', 'Clear national ID number', 'Holograms and microprint legible', 'Original card only (no photocopies)'],
      countries: ['India (Aadhaar / Voter ID)', 'EU National Identity Cards', 'UK Biometric Residence Permit', 'UAE Emirates ID', 'Singapore NRIC', 'Brazil RG / CNH', 'South Africa Smart ID'],
    },
    {
      type: 'Driver Licenses',
      icon: Car,
      description: 'Official driving licenses issued by transport authorities and state departments.',
      requirements: ['Both front and back uploads required', 'Clear driver license number', 'Valid validity / expiry period', 'Address zone clearly visible'],
      countries: ['United States (All 50 States)', 'United Kingdom DVLA', 'European Union Member States', 'India Smart Card DL', 'Canada Provincial Licenses', 'Australia State Licenses'],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Supported Identity Documents
        </h1>
        <p className="mt-4 text-base text-slate-600">
          KYC-Flow supports national identity documentation across 190+ jurisdictions with automatic template alignment and checksum verification.
        </p>
      </div>

      {/* Document cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {docTypes.map((doc) => {
          const Icon = doc.icon;
          return (
            <div key={doc.type} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{doc.type}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{doc.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Capture Requirements</h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {doc.requirements.map((req, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Popular Regions</h4>
                <div className="flex flex-wrap gap-1">
                  {doc.countries.slice(0, 6).map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-medium">
                      {c}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] rounded font-medium">
                    +{doc.countries.length - 6} more
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guidelines Box */}
      <div className="bg-slate-900 text-slate-300 p-8 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-white">Need to verify with an unlisted document?</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Our compliance team regularly introduces country-specific document templates. You can also request manual review with utility bills or certified national documentation.
          </p>
        </div>
        <Link
          to="/verify"
          className="shrink-0 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center space-x-2 shadow-sm"
        >
          <span>Start Verification</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
