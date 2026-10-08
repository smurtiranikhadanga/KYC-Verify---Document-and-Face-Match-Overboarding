import React, { useState, useEffect } from 'react';
import {
  Scale,
  ShieldCheck,
  FileText,
  Trash2,
  Lock,
  Download,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { complianceService } from '../../services/compliance.service';
import { useAuth } from '../../context/AuthContext';

export const CompliancePage: React.FC = () => {
  const { role } = useAuth();
  const canExecuteDsar = role === 'compliance_officer' || role === 'admin';
  const [activeTab, setActiveTab] = useState<'CONSENTS' | 'DSAR' | 'RETENTION'>('CONSENTS');

  // Consents State
  const [consents, setConsents] = useState<any[]>([]);
  const [consentSearch, setConsentSearch] = useState('');
  const [consentsLoading, setConsentsLoading] = useState(true);

  // DSAR State
  const [dsarRequests, setDsarRequests] = useState<any[]>([]);
  const [dsarLoading, setDsarLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<any | null>(null);

  // Retention State
  const [retentionPolicies, setRetentionPolicies] = useState<any[]>([]);

  const fetchConsents = async () => {
    setConsentsLoading(true);
    try {
      const res = await complianceService.getConsents({ search: consentSearch || undefined });
      if (res.success) setConsents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setConsentsLoading(false);
    }
  };

  const fetchDsar = async () => {
    setDsarLoading(true);
    try {
      const res = await complianceService.getDsarRequests();
      if (res.success) setDsarRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDsarLoading(false);
    }
  };

  const fetchRetention = async () => {
    try {
      const res = await complianceService.getRetentionPolicies();
      if (res.success) setRetentionPolicies(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConsents();
    fetchDsar();
    fetchRetention();
  }, []);

  const handleExecuteDsar = async (id: string) => {
    if (!window.confirm('Execute GDPR Article 17 Erasure? This will permanently delete all physical biometric artifacts and case embeddings from storage.')) {
      return;
    }
    setExecutingId(id);
    try {
      const res = await complianceService.executeDsar(id);
      if (res.success && res.data?.certificate) {
        setSelectedCertificate(res.data.certificate);
        fetchDsar();
      }
    } catch (err: any) {
      alert(`DSAR Execution failed: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance & Privacy Governance</h2>
        <p className="text-xs text-slate-500 mt-1">
          Consent ledger evidence, statutory data subject rights execution, and automated retention management.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('CONSENTS')}
          className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'CONSENTS'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Biometric Consent Ledger ({consents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DSAR')}
          className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'DSAR'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>DSAR & Erasure Inbox ({dsarRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RETENTION')}
          className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'RETENTION'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Retention Schedules & Legal Hold</span>
        </button>
      </div>

      {/* Tab 1: Consent Ledger */}
      {activeTab === 'CONSENTS' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Applicant Name or Case ID..."
                value={consentSearch}
                onChange={(e) => setConsentSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchConsents()}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              onClick={fetchConsents}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Search Ledger</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Signatory Name</th>
                    <th className="px-5 py-3.5">Associated Case</th>
                    <th className="px-5 py-3.5">Consent Type</th>
                    <th className="px-5 py-3.5">Policy Version</th>
                    <th className="px-5 py-3.5">Signed At</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 font-mono">SHA-256 Text Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {consents.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{c.signatureName}</td>
                      <td className="px-5 py-3.5 font-mono text-brand-700">{c.caseId || 'Standalone'}</td>
                      <td className="px-5 py-3.5 capitalize font-medium">{c.type}</td>
                      <td className="px-5 py-3.5">v{c.policyVersion}.0</td>
                      <td className="px-5 py-3.5 text-slate-500">{new Date(c.at).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        {c.granted ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-bold">
                            WITHDRAWN
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                        {c.textHash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: DSAR & Erasure */}
      {activeTab === 'DSAR' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Data Subject Requests Inbox</h3>
                <p className="text-xs text-slate-500">GDPR Article 17 Erasure and Article 15 Data Access Requests</p>
              </div>
              <button
                onClick={fetchDsar}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Requests</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Request ID</th>
                    <th className="px-5 py-3.5">Applicant Email</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Submitted</th>
                    <th className="px-5 py-3.5">Reason</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dsarRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-mono font-bold text-brand-700">{req.requestId}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{req.email}</td>
                      <td className="px-5 py-3.5 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            req.type === 'DELETION' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {req.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(req.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{req.reason || 'None specified'}</td>
                      <td className="px-5 py-3.5 text-right">
                        {req.status !== 'COMPLETED' ? (
                          canExecuteDsar ? (
                            <button
                              onClick={() => handleExecuteDsar(req.requestId)}
                              disabled={executingId === req.requestId}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] rounded transition-colors shadow-xs"
                            >
                              {executingId === req.requestId ? 'Purging...' : 'Execute Erasure'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-medium">
                              Pending Officer Action
                            </span>
                          )
                        ) : req.completionCertificate ? (
                          <button
                            onClick={() => setSelectedCertificate(req.completionCertificate)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded transition-colors"
                          >
                            View Certificate
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">Executed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Retention Schedules */}
      {activeTab === 'RETENTION' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Regulatory Retention Rules & Legal Hold Controls</h3>
            <p className="text-xs text-slate-500">Statutory record keeping and automated purge scheduling</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Data Classification</th>
                  <th className="px-5 py-3.5">Mandated Retention Period</th>
                  <th className="px-5 py-3.5">Jurisdiction</th>
                  <th className="px-5 py-3.5">Next Scheduled Purge</th>
                  <th className="px-5 py-3.5">Legal Basis</th>
                  <th className="px-5 py-3.5">Legal Hold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {retentionPolicies.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{p.dataClass}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{p.retentionPeriod}</td>
                    <td className="px-5 py-3.5">{p.jurisdiction}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">{p.nextPurge}</td>
                    <td className="px-5 py-3.5 text-slate-500">{p.lawfulBasis}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.legalHold ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.legalHold ? 'ACTIVE HOLD' : 'NORMAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completion Certificate Modal */}
      {selectedCertificate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center space-x-2 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Certificate of Erasure</h3>
            </div>
            <p className="text-xs text-slate-600">
              This official cryptographic certificate verifies that all physical biometric artifacts and associated database records were permanently purged.
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
              <div>Certificate ID: <strong>{selectedCertificate.certificateId}</strong></div>
              <div>Physical Artifacts Deleted: <strong>{selectedCertificate.erasedArtifactCount} file(s)</strong></div>
              <div>Cases Purged: <strong>{selectedCertificate.erasedCaseCount}</strong></div>
              <div>Timestamp: <strong>{new Date(selectedCertificate.timestamp).toISOString()}</strong></div>
              <div className="pt-2 text-[10px] text-slate-500 break-all">
                Hash Proof: {selectedCertificate.hashProof}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCertificate(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
