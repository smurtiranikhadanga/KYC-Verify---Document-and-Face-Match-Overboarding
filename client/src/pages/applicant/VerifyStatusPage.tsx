import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  FileText,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { caseService } from '../../services/case.service';
import { useVerification } from '../../context/VerificationContext';

export const VerifyStatusPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { updateState } = useVerification();

  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState<string>('Initializing analysis pipeline...');

  const fetchStatus = async () => {
    if (!caseId) return;
    try {
      const res = await caseService.getCaseStatus(caseId);
      if (res.success && res.data) {
        setStatusData(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Poll while processing or queued
    const interval = setInterval(() => {
      if (
        !statusData ||
        statusData.state === 'QUEUED' ||
        statusData.state === 'PROCESSING' ||
        statusData.state === 'DOCS_UPLOADED'
      ) {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [caseId, statusData?.state]);

  // Simulated pipeline micro-steps animation while in PROCESSING state
  useEffect(() => {
    if (statusData?.state === 'QUEUED' || statusData?.state === 'PROCESSING') {
      const steps = [
        'Preprocessing document images (deskew, glare suppression)...',
        'Extracting structured fields via PaddleOCR...',
        'Validating MRZ checksum and expiration dates...',
        'Computing facial geometry embeddings with ArcFace...',
        'Evaluating passive anti-spoof liveness score...',
        'Executing OpenCV error level (ELA) tamper analysis...',
        'Applying jurisdiction policy rules in Decision Engine...',
      ];
      let i = 0;
      const stepTimer = setInterval(() => {
        i = (i + 1) % steps.length;
        setPipelineProgress(steps[i]);
      }, 1400);
      return () => clearInterval(stepTimer);
    }
  }, [statusData?.state]);

  const handleResubmit = async () => {
    if (!caseId) return;
    try {
      await caseService.resubmitCase(caseId);
      updateState({ caseId });
      navigate('/verify/document');
    } catch (err: any) {
      alert(`Could not restart submission: ${err.message}`);
    }
  };

  if (loading && !statusData) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-slate-600">Retrieving case verification status...</p>
      </div>
    );
  }

  const state = statusData?.state || 'QUEUED';
  const isApproved = state === 'APPROVED' || state === 'AUTO_APPROVED';
  const isManualReview = state === 'MANUAL_REVIEW';
  const isNeedsResubmission = state === 'NEEDS_RESUBMISSION';
  const isRejected = state === 'REJECTED' || state === 'AUTO_REJECTED';
  const isProcessing = state === 'QUEUED' || state === 'PROCESSING' || state === 'DOCS_UPLOADED';

  // Stepper state computation
  type StepStatus = 'done' | 'active' | 'warning' | 'danger' | 'pending';

  interface StepItem {
    label: string;
    status: StepStatus;
    icon?: React.ReactNode;
  }

  const getStep5 = (): { label: string; status: StepStatus; icon?: React.ReactNode } => {
    if (isApproved) {
      return { label: 'Approved', status: 'done', icon: <CheckCircle2 className="w-4 h-4" /> };
    }
    if (isRejected) {
      return { label: 'Rejected', status: 'danger', icon: <XCircle className="w-4 h-4" /> };
    }
    if (isManualReview) {
      return { label: 'Manual Review', status: 'warning', icon: <Clock className="w-4 h-4" /> };
    }
    if (isNeedsResubmission) {
      return { label: 'Action Needed', status: 'warning', icon: <AlertTriangle className="w-4 h-4" /> };
    }
    return { label: 'Decision Result', status: 'pending' };
  };

  const step5 = getStep5();

  const stepItems: StepItem[] = [
    { label: 'Verification Started', status: 'done', icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: 'Consent Received', status: 'done', icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: 'Documents Uploaded', status: 'done', icon: <CheckCircle2 className="w-4 h-4" /> },
    {
      label: 'Verification Processing',
      status: isProcessing ? 'active' : 'done',
      icon: isProcessing ? undefined : <CheckCircle2 className="w-4 h-4" />,
    },
    step5,
  ];

  const getCircleStyles = (status: StepStatus) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-600 text-white shadow-xs';
      case 'active':
        return 'bg-brand-600 text-white ring-4 ring-brand-100 animate-pulse';
      case 'warning':
        return 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse';
      case 'danger':
        return 'bg-rose-600 text-white shadow-xs';
      case 'pending':
      default:
        return 'bg-slate-200 text-slate-500';
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-brand-600" />
          <span className="text-sm font-bold text-slate-800">Verification Tracker</span>
        </div>
        <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded">
          {caseId}
        </div>
      </div>

      {/* Stepper Progress Visualizer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {stepItems.map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${getCircleStyles(
                    step.status
                  )}`}
                >
                  {step.icon || idx + 1}
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1 text-center hidden sm:block max-w-[80px]">
                  {step.label}
                </span>
              </div>
              {idx < stepItems.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all ${
                    stepItems[idx + 1].status === 'warning'
                      ? 'bg-amber-300'
                      : stepItems[idx + 1].status === 'danger'
                      ? 'bg-rose-300'
                      : step.status === 'done'
                      ? 'bg-emerald-500'
                      : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Outcome / Current Status Card */}
      <div className="pt-2">
        {/* State: PROCESSING / QUEUED */}
        {isProcessing && (
          <div className="p-8 bg-blue-50/60 rounded-2xl border border-blue-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-brand-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Verification In Progress</h3>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                {statusData?.message || 'Our automated pipeline is currently verifying your identity.'}
              </p>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-blue-200/80 max-w-md mx-auto text-xs text-brand-800 font-mono flex items-center justify-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
              <span>{pipelineProgress}</span>
            </div>
          </div>
        )}

        {/* State: APPROVED / AUTO_APPROVED */}
        {isApproved && (
          <div className="p-8 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
                Approved
              </span>
              <h3 className="text-2xl font-bold text-slate-900">Identity Verified Successfully</h3>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                {statusData?.explanation ||
                  'Your identity documents, face match, and anti-spoof liveness passed all regulatory security checks.'}
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/privacy-center"
                className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                Manage Data / Privacy Center
              </Link>
              <Link
                to="/"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                Return to Home
              </Link>
            </div>
          </div>
        )}

        {/* State: MANUAL_REVIEW */}
        {isManualReview && (
          <div className="p-8 bg-amber-50/70 rounded-2xl border border-amber-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
                Under Manual Review
              </span>
              <h3 className="text-2xl font-bold text-slate-900">Additional Review Required</h3>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                {statusData?.explanation ||
                  'A compliance officer is currently performing a secondary review of your file. This standard verification step usually takes 5 to 15 minutes.'}
              </p>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200/80 max-w-md mx-auto text-xs text-amber-800">
              SLA Guarantee: Standard review turnaround &le; 2 hours. You do not need to resubmit.
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={fetchStatus}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center space-x-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
              <button
                onClick={handleResubmit}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center space-x-1.5 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-upload Documents</span>
              </button>
              <Link
                to="/staff/login"
                target="_blank"
                className="px-4 py-2 bg-white border border-amber-300 text-amber-900 text-xs font-semibold rounded-lg hover:bg-amber-100/70 transition-colors inline-flex items-center space-x-1.5 shadow-xs"
              >
                <span>Staff Review Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* State: NEEDS_RESUBMISSION */}
        {isNeedsResubmission && (
          <div className="p-8 bg-amber-50/70 rounded-2xl border border-amber-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
                Resubmission Needed
              </span>
              <h3 className="text-2xl font-bold text-slate-900">Please Retake Document Photo</h3>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                {statusData?.explanation ||
                  'The uploaded document image had glare or blur preventing clear optical text reading.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleResubmit}
                className="px-7 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center space-x-2 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Document Photo Now</span>
              </button>
            </div>
          </div>
        )}

        {/* State: REJECTED / AUTO_REJECTED */}
        {isRejected && (
          <div className="p-8 bg-red-50/70 rounded-2xl border border-red-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider mb-2">
                Verification Unsuccessful
              </span>
              <h3 className="text-2xl font-bold text-slate-900">Verification Could Not Be Completed</h3>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                {statusData?.explanation ||
                  'We were unable to verify your identity with the provided documentation. Please contact support or submit certified physical identification.'}
              </p>
            </div>
            <div className="pt-3 flex flex-wrap justify-center gap-3">
              <button
                onClick={handleResubmit}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center space-x-1.5 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-upload Documents</span>
              </button>
              <Link
                to="/contact"
                className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center space-x-1.5"
              >
                <span>Contact Compliance Support</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Case Details Box */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
        <div>
          <span>Document Type: </span>
          <strong className="text-slate-800 capitalize">
            {statusData?.documentType?.replace('_', ' ') || 'Passport'}
          </strong>
          <span className="mx-2">&bull;</span>
          <span>Jurisdiction: </span>
          <strong className="text-slate-800">{statusData?.jurisdiction || 'Global'}</strong>
        </div>
        <div className="text-[11px] text-slate-400">
          Last Updated: {statusData?.updatedAt ? new Date(statusData.updatedAt).toLocaleTimeString() : 'Just now'}
        </div>
      </div>
    </div>
  );
};
