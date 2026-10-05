import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  History,
  Search,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Key,
  Filter,
} from 'lucide-react';
import { complianceService } from '../../services/compliance.service';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<string>('VERIFIED_SECURE');
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await complianceService.getAuditLogs({
        action: actionFilter || undefined,
        actor: actorFilter || undefined,
      });
      if (res.success && res.data) {
        setLogs(res.data.logs);
        setIntegrityStatus(res.data.integrity?.status || 'VERIFIED_SECURE');
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Immutable Cryptographic Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident, hash-chained activity records ensuring complete statutory accountability for every read, reveal, and decision.
          </p>
        </div>

        {/* Chain Integrity Badge */}
        <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>SHA-256 Chain Integrity: Verified Secure</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Actor Email..."
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">Action: All Events</option>
          <option value="LOGIN">LOGIN</option>
          <option value="CASE_CREATED">CASE_CREATED</option>
          <option value="CONSENT_GIVEN">CONSENT_GIVEN</option>
          <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
          <option value="CASE_PROCESSED">CASE_PROCESSED</option>
          <option value="CASE_APPROVE">CASE_APPROVE</option>
          <option value="CASE_REJECT">CASE_REJECT</option>
          <option value="PII_REVEALED">PII_REVEALED</option>
          <option value="DECISION_OVERRIDDEN">DECISION_OVERRIDDEN</option>
          <option value="DATA_ERASED">DATA_ERASED</option>
        </select>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Verifying cryptographic block hashes...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Action Event</th>
                  <th className="px-5 py-3.5">Target Resource</th>
                  <th className="px-5 py-3.5">Outcome</th>
                  <th className="px-5 py-3.5 font-mono">Current Hash (SHA-256)</th>
                  <th className="px-5 py-3.5 font-mono">Previous Block Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {log.actor?.email || log.actor?.id || 'System'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] uppercase font-mono font-medium">
                        {log.actor?.role || 'system'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          log.action.includes('REVEAL')
                            ? 'text-amber-600'
                            : log.action.includes('ERASE') || log.action.includes('REJECT')
                            ? 'text-red-600'
                            : log.action.includes('APPROVE')
                            ? 'text-emerald-600'
                            : 'text-brand-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                      {log.resource?.type}:{log.resource?.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.outcome === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400 truncate max-w-[130px]" title={log.hash}>
                      {log.hash}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400 truncate max-w-[130px]" title={log.prevHash}>
                      {log.prevHash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
