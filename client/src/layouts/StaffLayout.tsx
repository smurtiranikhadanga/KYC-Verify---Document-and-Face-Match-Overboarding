import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Inbox,
  Scale,
  Users,
  Cpu,
  History,
  LogOut,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const StaffLayout: React.FC = () => {
  const { user, role, logout, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/staff/login');
  };

  const handleQuickSwitch = async (email: string) => {
    try {
      await login(email, 'Password123!');
      window.location.reload();
    } catch (e: any) {
      alert(`Switch failed: ${e.message}`);
    }
  };

  const navItems = [
    {
      label: 'Overview',
      path: '/staff/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'reviewer', 'senior_reviewer', 'compliance_officer', 'ml_engineer', 'auditor'],
    },
    {
      label: 'Review Queue',
      path: '/staff/review-queue',
      icon: Inbox,
      roles: ['reviewer', 'senior_reviewer', 'compliance_officer', 'admin', 'auditor'],
    },
    {
      label: 'Compliance & DSAR',
      path: '/staff/compliance',
      icon: Scale,
      roles: ['compliance_officer', 'senior_reviewer', 'admin', 'auditor'],
    },
    {
      label: 'Admin Governance',
      path: '/staff/admin',
      icon: Users,
      roles: ['admin', 'auditor'],
    },
    {
      label: 'MLOps & Accuracy',
      path: '/staff/mlops',
      icon: Cpu,
      roles: ['ml_engineer', 'admin', 'compliance_officer', 'auditor'],
    },
    {
      label: 'Audit Trail',
      path: '/staff/audit',
      icon: History,
      roles: ['compliance_officer', 'auditor', 'admin'],
    },
  ];

  const allowedNav = navItems.filter((item) => (role ? item.roles.includes(role) : false));

  // Role Badge Color
  const getRoleBadge = (r?: string) => {
    switch (r) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'senior_reviewer':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'compliance_officer':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'ml_engineer':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'auditor':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">KYC-Flow</span>
              <span className="text-[11px] block font-medium text-slate-400">Staff Console</span>
            </div>
          </Link>
        </div>

        {/* Current User Card */}
        <div className="p-4 bg-slate-800/60 border-b border-slate-800 m-3 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm border border-brand-500/30">
              {user?.name ? user.name[0] : 'S'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-white truncate">{user?.name || 'Staff User'}</div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getRoleBadge(
                role || undefined
              )}`}
            >
              {role?.replace('_', ' ') || 'Staff'}
            </span>
            <span className="text-[10px] text-slate-400">{user?.region || 'Global'}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4 opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Role Switcher helper for testing */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="text-[11px] text-slate-400 font-semibold mb-2 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Demo Role Switcher</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              onClick={() => handleQuickSwitch('reviewer@kycflow.dev')}
              className="text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-[11px]"
            >
              Reviewer
            </button>
            <button
              onClick={() => handleQuickSwitch('senior@kycflow.dev')}
              className="text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-[11px]"
            >
              Senior Rev
            </button>
            <button
              onClick={() => handleQuickSwitch('compliance@kycflow.dev')}
              className="text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-[11px]"
            >
              Compliance
            </button>
            <button
              onClick={() => handleQuickSwitch('admin@kycflow.dev')}
              className="text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-[11px]"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickSwitch('ml@kycflow.dev')}
              className="text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-[11px]"
            >
              ML Engineer
            </button>
            <button
              onClick={() => handleQuickSwitch('auditor@kycflow.dev')}
              className="text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-[11px]"
            >
              Auditor
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center space-x-3">
            <h1 className="text-base font-bold text-slate-900 capitalize">
              {location.pathname.split('/')[2]?.replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-slate-500 hidden sm:block">
              Role: <strong className="text-slate-800 uppercase">{role?.replace('_', ' ')}</strong>
            </div>
            <Link
              to="/privacy-center"
              className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
            >
              Applicant Center &rarr;
            </Link>
          </div>
        </header>

        {/* Content body */}
        <main className="p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
