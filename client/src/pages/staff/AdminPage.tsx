import React, { useState, useEffect } from 'react';
import {
  Users,
  Sliders,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Power,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'POLICY'>('USERS');

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Policy State
  const [policy, setPolicy] = useState<any>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySuccess, setPolicySuccess] = useState(false);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await adminService.getUsers();
      if (res.success) setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPolicy = async () => {
    setPolicyLoading(true);
    try {
      const res = await adminService.getPolicies();
      if (res.success && res.data.length > 0) {
        setPolicy(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPolicyLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPolicy();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await adminService.updateUserRole(userId, newRole);
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
      }
    } catch (err: any) {
      alert(`Role update failed: ${err.message}`);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await adminService.updateUserStatus(userId, !currentStatus);
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive: !currentStatus } : u)));
      }
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) return;
    setSavingPolicy(true);
    setPolicySuccess(false);
    try {
      const res = await adminService.updatePolicy(policy._id, {
        faceMatchThreshold: policy.faceMatchThreshold,
        livenessThreshold: policy.livenessThreshold,
        tamperThreshold: policy.tamperThreshold,
        ocrConfidenceThreshold: policy.ocrConfidenceThreshold,
        autoApproveAllowed: policy.autoApproveAllowed,
        activeLivenessRequired: policy.activeLivenessRequired,
      });
      if (res.success) {
        setPolicy(res.data);
        setPolicySuccess(true);
        setTimeout(() => setPolicySuccess(false), 4000);
      }
    } catch (err: any) {
      alert(`Policy update failed: ${err.message}`);
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Administration & Policy Governance</h2>
        <p className="text-xs text-slate-500 mt-1">
          Staff role assignments, operational account status, and automated decision threshold calibration.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'USERS'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Identity & RBAC ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('POLICY')}
          className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'POLICY'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Decision Engine Thresholds (v{policy?.version || 1}.0)</span>
        </button>
      </div>

      {/* Tab 1: Users */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Provisioned Staff Directory</h3>
            <button
              onClick={fetchUsers}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Users</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Staff Name</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{u.name}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="reviewer">Reviewer</option>
                        <option value="senior_reviewer">Senior Reviewer</option>
                        <option value="compliance_officer">Compliance Officer</option>
                        <option value="admin">Administrator</option>
                        <option value="ml_engineer">ML Engineer</option>
                        <option value="auditor">Auditor</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{u.department || 'Operations'}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleStatusToggle(u._id, u.isActive)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          u.isActive
                            ? 'bg-slate-100 hover:bg-red-50 text-red-600'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Policy Configuration */}
      {activeTab === 'POLICY' && policy && (
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs max-w-2xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">{policy.name}</h3>
              <p className="text-xs text-slate-500">Policy Version {policy.version}.0 &bull; Jurisdiction: {policy.jurisdiction}</p>
            </div>
            {policySuccess && (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Policy Version Bumped & Saved</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSavePolicy} className="space-y-5 text-xs">
            {/* Threshold 1: Face Match */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Face Match Cosine Threshold:</span>
                <span className="font-mono text-brand-700 font-bold text-sm">
                  {Math.round(policy.faceMatchThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.01"
                value={policy.faceMatchThreshold}
                onChange={(e) => setPolicy({ ...policy, faceMatchThreshold: parseFloat(e.target.value) })}
                className="w-full accent-brand-600"
              />
              <p className="text-[11px] text-slate-400">
                Operating operating threshold for ArcFace embedding similarity. Default: 80%.
              </p>
            </div>

            {/* Threshold 2: Liveness */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Anti-Spoof Liveness Threshold:</span>
                <span className="font-mono text-brand-700 font-bold text-sm">
                  {Math.round(policy.livenessThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.99"
                step="0.01"
                value={policy.livenessThreshold}
                onChange={(e) => setPolicy({ ...policy, livenessThreshold: parseFloat(e.target.value) })}
                className="w-full accent-brand-600"
              />
              <p className="text-[11px] text-slate-400">
                Passive CNN anti-spoof threshold. Lower scores trigger manual review or active challenge.
              </p>
            </div>

            {/* Threshold 3: Tamper */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Tamper Anomaly Threshold (Max Allowed Error):</span>
                <span className="font-mono text-brand-700 font-bold text-sm">
                  {Math.round(policy.tamperThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.90"
                step="0.01"
                value={policy.tamperThreshold}
                onChange={(e) => setPolicy({ ...policy, tamperThreshold: parseFloat(e.target.value) })}
                className="w-full accent-brand-600"
              />
              <p className="text-[11px] text-slate-400">
                Maximum permissible ELA + FFT anomaly error before flagging document for fraud review.
              </p>
            </div>

            {/* Threshold 4: OCR Confidence */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Minimum OCR Confidence Threshold:</span>
                <span className="font-mono text-brand-700 font-bold text-sm">
                  {Math.round(policy.ocrConfidenceThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.60"
                max="0.95"
                step="0.01"
                value={policy.ocrConfidenceThreshold}
                onChange={(e) => setPolicy({ ...policy, ocrConfidenceThreshold: parseFloat(e.target.value) })}
                className="w-full accent-brand-600"
              />
              <p className="text-[11px] text-slate-400">
                Below this confidence on primary fields, the system requests photo resubmission.
              </p>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.autoApproveAllowed}
                  onChange={(e) => setPolicy({ ...policy, autoApproveAllowed: e.target.checked })}
                  className="rounded text-brand-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Allow Straight-Through Auto-Approval</span>
                  <span className="text-[11px] text-slate-500">
                    If disabled, all cases must be claimed by human reviewers regardless of score.
                  </span>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.activeLivenessRequired}
                  onChange={(e) => setPolicy({ ...policy, activeLivenessRequired: e.target.checked })}
                  className="rounded text-brand-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Require Active Liveness Challenges for All</span>
                  <span className="text-[11px] text-slate-500">
                    Forces head-turn and blink challenges on every applicant instead of passive-first.
                  </span>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={savingPolicy}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingPolicy ? 'Saving & Publishing Version...' : 'Save Policy Changes'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
