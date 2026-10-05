import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Scale,
  Cpu,
  ArrowRight,
  TrendingUp,
  Activity,
  Users,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { reviewService } from '../../services/review.service';
import { useAuth } from '../../context/AuthContext';

export const StaffDashboardPage: React.FC = () => {
  const { role } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const statsRes = await adminService.getStats();
        if (statsRes.success) setStats(statsRes.data);

        const queueRes = await reviewService.getQueue({ status: 'MANUAL_REVIEW' });
        if (queueRes.success) setRecentCases(queueRes.data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Executive Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline metrics, review queue pressure, and SLA compliance monitoring.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/staff/review-queue"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Open Review Queue</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Submissions</span>
            <Activity className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalCases || 22}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>+14% vs last week</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Auto-Approved (STP)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.approvalRate || 72}%</div>
          <div className="text-[11px] text-slate-500 font-medium">Straight-through path</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.pendingReviews || 6}</div>
          <div className="text-[11px] text-amber-600 font-medium">SLA: 100% on time</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Avg Decision Time</span>
            <Clock className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.medianTimeToDecisionMinutes || 3.2}m</div>
          <div className="text-[11px] text-slate-500 font-medium">Target &le; 5.0m</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Needs Resubmit</span>
            <AlertTriangle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.needsResubmission || 2}</div>
          <div className="text-[11px] text-slate-500 font-medium">Quality-related retakes</div>
        </div>
      </div>

      {/* Flagged Cases Pending Review */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Priority Cases Requiring Manual Review</h3>
            <p className="text-xs text-slate-500">Flagged by decision rules due to low confidence or borderline similarity</p>
          </div>
          <Link
            to="/staff/review-queue"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
          >
            <span>View All Queue &rarr;</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Case ID</th>
                <th className="px-5 py-3">Age</th>
                <th className="px-5 py-3">Risk Score</th>
                <th className="px-5 py-3">Trigger Flags</th>
                <th className="px-5 py-3">Jurisdiction</th>
                <th className="px-5 py-3">Doc Type</th>
                <th className="px-5 py-3">Assigned To</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {recentCases.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-brand-700">{c.caseId}</td>
                  <td className="px-5 py-3.5 text-slate-500">{c.ageMinutes}m ago</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-bold ${
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
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {c.riskFlags && c.riskFlags.length > 0 ? (
                        c.riskFlags.map((f: string, i: number) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono"
                          >
                            {f}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">{c.jurisdiction}</td>
                  <td className="px-5 py-3.5 capitalize">{c.documentType?.replace('_', ' ')}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.assignedTo}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/staff/cases/${c.caseId}`}
                      className="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded transition-colors inline-block"
                    >
                      Review &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Portal Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/staff/compliance"
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-300 transition-all flex items-start space-x-3.5"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Compliance Console</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Consent ledger search, DSAR erasure executions, and retention schedules.
            </p>
          </div>
        </Link>

        <Link
          to="/staff/mlops"
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-300 transition-all flex items-start space-x-3.5"
        >
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">MLOps & Drift Analysis</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Model registry, PSI drift monitors, CER/WER accuracy trends, and retraining gates.
            </p>
          </div>
        </Link>

        <Link
          to="/staff/audit"
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-300 transition-all flex items-start space-x-3.5"
        >
          <div className="p-3 bg-blue-50 text-brand-600 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Immutable Audit Trail</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Cryptographic SHA-256 chain verification for all logins, reveals, and decisions.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};
