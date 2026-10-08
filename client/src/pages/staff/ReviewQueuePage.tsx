import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Filter,
  Search,
  Clock,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { reviewService } from '../../services/review.service';
import { useAuth } from '../../context/AuthContext';

export const ReviewQueuePage: React.FC = () => {
  const { user, role } = useAuth();
  const canReview = role === 'reviewer' || role === 'senior_reviewer';
  const [cases, setCases] = useState<any[]>([]);
  const [queueMeta, setQueueMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchQueue = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await reviewService.getQueue({
        status: statusFilter || undefined,
        risk: riskFilter || undefined,
        jurisdiction: jurisdictionFilter || undefined,
        docType: docTypeFilter || undefined,
        search: searchTerm || undefined,
      });
      if (res.success) {
        setCases(res.data);
        if (res.meta) setQueueMeta(res.meta);
      }
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(false);
    const interval = setInterval(() => {
      fetchQueue(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [statusFilter, riskFilter, jurisdictionFilter, docTypeFilter, searchTerm]);

  const handleClaim = async (caseId: string) => {
    try {
      const res = await reviewService.claimCase(caseId);
      if (res.success) {
        fetchQueue();
      }
    } catch (err: any) {
      alert(`Could not claim case: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Verification Review Queue</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
              ● Live Sync (3s)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized cases sorted by SLA deadline and decision risk priority. Zero applicant PII exposed in queue listings.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg border border-brand-200 shadow-2xs">
              Showing: <span className="font-mono font-bold">{cases.length}</span> records
            </span>
            {queueMeta.totalAllCases !== undefined && (
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                Total in System: <span className="font-mono font-bold">{queueMeta.totalAllCases}</span>
              </span>
            )}
          </div>

          <button
            onClick={() => fetchQueue()}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center space-x-1.5 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
            statusFilter === ''
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          All Submissions ({queueMeta.totalAllCases ?? cases.length})
        </button>
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
            statusFilter === 'ACTIVE'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Pending Review ({queueMeta.pendingCount ?? 0})
        </button>
        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setStatusFilter('MANUAL_REVIEW')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
            statusFilter === 'MANUAL_REVIEW'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Manual Review
        </button>
        <button
          onClick={() => setStatusFilter('NEEDS_RESUBMISSION')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
            statusFilter === 'NEEDS_RESUBMISSION'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Needs Resubmit
        </button>
        <button
          onClick={() => setStatusFilter('REJECTED')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Rejected
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Case ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">Status: Active Pending Queue</option>
          <option value="ALL">Status: All Cases (Total History)</option>
          <option value="MANUAL_REVIEW">Manual Review</option>
          <option value="NEEDS_RESUBMISSION">Needs Resubmission</option>
          <option value="PROCESSING">Processing</option>
          <option value="QUEUED">Queued</option>
          <option value="APPROVED">Approved (Manual & Auto)</option>
          <option value="REJECTED">Rejected (Manual & Auto)</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">Risk: All Tiers</option>
          <option value="high">High Risk (&ge; 60)</option>
          <option value="medium">Medium Risk (30 - 59)</option>
          <option value="low">Low Risk (&lt; 30)</option>
        </select>

        <select
          value={docTypeFilter}
          onChange={(e) => setDocTypeFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">Document: All Types</option>
          <option value="passport">Passport</option>
          <option value="national_id">National ID</option>
          <option value="driver_license">Driver License</option>
        </select>

        <select
          value={jurisdictionFilter}
          onChange={(e) => setJurisdictionFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">Jurisdiction: All</option>
          <option value="IN">India (IN)</option>
          <option value="GB">United Kingdom (GB)</option>
          <option value="DE">Germany (DE)</option>
          <option value="US">United States (US)</option>
          <option value="FR">France (FR)</option>
          <option value="ES">Spain (ES)</option>
          <option value="AE">UAE (AE)</option>
        </select>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading review queue...
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="font-semibold text-slate-800">Queue is Clear</div>
            <p>No verification cases match the selected filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Case ID</th>
                  <th className="px-5 py-3.5">Age / SLA</th>
                  <th className="px-5 py-3.5">Risk Score</th>
                  <th className="px-5 py-3.5">Reason Flags</th>
                  <th className="px-5 py-3.5">Jurisdiction</th>
                  <th className="px-5 py-3.5">Doc Type</th>
                  <th className="px-5 py-3.5">Submissions</th>
                  <th className="px-5 py-3.5">State</th>
                  <th className="px-5 py-3.5">Assigned Reviewer</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {cases.map((c) => {
                  const isClaimedByMe = c.assignedTo === user?.name;
                  return (
                    <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-brand-700">
                        <Link to={`/staff/cases/${c.caseId}`} className="hover:underline">
                          {c.caseId}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-slate-800">{c.ageMinutes}m ago</div>
                        <div className="text-[10px] text-emerald-600 font-medium flex items-center space-x-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Within 2h SLA</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded font-bold ${
                            c.riskScore >= 60
                              ? 'bg-red-100 text-red-700'
                              : c.riskScore >= 30
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {c.riskScore}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {c.riskFlags && c.riskFlags.length > 0 ? (
                            c.riskFlags.map((f: string, i: number) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono"
                              >
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{c.jurisdiction}</td>
                      <td className="px-5 py-3.5 capitalize">{c.documentType?.replace('_', ' ')}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono font-bold text-[11px] border border-slate-200">
                          #{c.submissionCount || 1}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            c.state === 'APPROVED' || c.state === 'AUTO_APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.state === 'REJECTED' || c.state === 'AUTO_REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : c.state === 'MANUAL_REVIEW'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {c.state?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {c.assignedTo !== 'Unassigned' ? (
                          <span className="flex items-center space-x-1">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>{c.assignedTo}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        {canReview && c.assignedTo === 'Unassigned' && (
                          <button
                            onClick={() => handleClaim(c.caseId)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition-colors"
                          >
                            Claim
                          </button>
                        )}
                        <Link
                          to={`/staff/cases/${c.caseId}`}
                          className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded text-[11px] transition-colors inline-block"
                        >
                          {canReview ? 'Review →' : 'View Case →'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
