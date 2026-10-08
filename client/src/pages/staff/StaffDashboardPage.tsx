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
  History,
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
    const interval = setInterval(loadDashboard, 3500);
    return () => clearInterval(interval);
  }, []);

  const canAccessQueue = role ? ['reviewer', 'senior_reviewer', 'compliance_officer', 'admin', 'auditor'].includes(role) : false;
  const canAccessMlops = role ? ['ml_engineer', 'admin', 'compliance_officer', 'auditor'].includes(role) : false;

  const quickCards = [
    {
      title: 'Verification Queue',
      desc: 'Active pipeline triage, SLA monitoring, and manual case review.',
      path: '/staff/review-queue',
      icon: Inbox,
      iconBg: 'bg-brand-50 text-brand-600',
      roles: ['reviewer', 'senior_reviewer', 'compliance_officer', 'admin', 'auditor'],
    },
    {
      title: 'MLOps & Drift Analysis',
      desc: 'Model registry, PSI drift monitors, CER/WER accuracy trends, and retraining gates.',
      path: '/staff/mlops',
      icon: Cpu,
      iconBg: 'bg-purple-50 text-purple-600',
      roles: ['ml_engineer', 'admin', 'compliance_officer', 'auditor'],
    },
    {
      title: 'Compliance Console',
      desc: 'Consent ledger search, DSAR erasure executions, and retention schedules.',
      path: '/staff/compliance',
      icon: Scale,
      iconBg: 'bg-emerald-50 text-emerald-600',
      roles: ['compliance_officer', 'senior_reviewer', 'admin', 'auditor'],
    },
    {
      title: 'Immutable Audit Trail',
      desc: 'Cryptographic SHA-256 chain verification for all logins, reveals, and decisions.',
      path: '/staff/audit',
      icon: History,
      iconBg: 'bg-blue-50 text-brand-600',
      roles: ['compliance_officer', 'auditor', 'admin'],
    },
    {
      title: 'Admin Governance',
      desc: 'Staff user roles, access provisioning, and verification threshold policies.',
      path: '/staff/admin',
      icon: Users,
      iconBg: 'bg-slate-100 text-slate-700',
      roles: ['admin', 'auditor'],
    },
  ];

  const visibleCards = quickCards.filter((card) => (role ? card.roles.includes(role) : false));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Executive Dashboard</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
              ● Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline metrics, review queue pressure, and SLA compliance monitoring.
          </p>
        </div>

        <div className="flex gap-2">
          {canAccessQueue ? (
            <Link
              to="/staff/review-queue"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Open Review Queue ({stats?.pendingReviews ?? recentCases.length})</span>
            </Link>
          ) : canAccessMlops ? (
            <Link
              to="/staff/mlops"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Open MLOps Console</span>
            </Link>
          ) : null}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Submissions</span>
            <Activity className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalCases ?? recentCases.length}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>Real-time counter</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Auto-Approved (STP)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.approvalRate ?? 0}%</div>
          <div className="text-[11px] text-slate-500 font-medium">Straight-through path</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.pendingReviews ?? recentCases.length}</div>
          <div className="text-[11px] text-amber-600 font-medium">Active queue pressure</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Avg Decision Time</span>
            <Clock className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.medianTimeToDecisionMinutes ?? 3.2}m</div>
          <div className="text-[11px] text-slate-500 font-medium">Target &le; 5.0m</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Needs Resubmit</span>
            <AlertTriangle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.needsResubmission ?? 0}</div>
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
          {canAccessQueue && (
            <Link
              to="/staff/review-queue"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
            >
              <span>View All Queue &rarr;</span>
            </Link>
          )}
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
                    {canAccessQueue ? (
                      <Link
                        to={`/staff/cases/${c.caseId}`}
                        className="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded transition-colors inline-block"
                      >
                        Review &rarr;
                      </Link>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-500 rounded">
                        Queued
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Portal Quick Links - Only cards permitted for current role */}
      {visibleCards.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Accessible Console Modules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCards.map((card, idx) => {
              const IconComponent = card.icon;
              return (
                <Link
                  key={idx}
                  to={card.path}
                  className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-300 hover:shadow-sm transition-all flex items-start space-x-3.5"
                >
                  <div className={`p-3 rounded-lg ${card.iconBg}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{card.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
