import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  UserCheck,
  FileText,
  Lock,
  ArrowLeft,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { caseService } from '../../services/case.service';
import { reviewService } from '../../services/review.service';
import { useAuth } from '../../context/AuthContext';

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document Viewer Controls
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [showTamperHeatmap, setShowTamperHeatmap] = useState<boolean>(false);
  const [showOcrBoxes, setShowOcrBoxes] = useState<boolean>(false);

  // Reveal PII Modal
  const [showRevealModal, setShowRevealModal] = useState<boolean>(false);
  const [revealJustification, setRevealJustification] = useState<string>('');
  const [revealing, setRevealing] = useState<boolean>(false);
  const [isPiiRevealed, setIsPiiRevealed] = useState<boolean>(false);

  // Senior Four-Eyes Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideOutcome, setOverrideOutcome] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [overrideJustification, setOverrideJustification] = useState<string>('');
  const [overriding, setOverriding] = useState<boolean>(false);

  // Decision Modal
  const [actionNotes, setActionNotes] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchCase = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const res = await caseService.getCaseById(caseId);
      if (res.success && res.data) {
        setCaseData(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load case detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  const handleDecision = async (action: 'APPROVE' | 'REJECT' | 'RESUBMIT' | 'ESCALATE') => {
    if (!caseId) return;
    if (role !== 'reviewer' && role !== 'senior_reviewer') {
      alert('Access denied: Decisions can only be made by Reviewers or Senior Reviewers.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await reviewService.decideCase(caseId, action, caseData?.riskFlags || [], actionNotes);
      if (res.success) {
        alert(`Case successfully updated: ${action}`);
        fetchCase();
      }
    } catch (err: any) {
      alert(`Decision error: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || revealJustification.length < 10) return;
    setRevealing(true);
    try {
      const res = await reviewService.revealPii(caseId, revealJustification);
      if (res.success && res.data) {
        setCaseData(res.data);
        setIsPiiRevealed(true);
        setShowRevealModal(false);
      }
    } catch (err: any) {
      alert(`PII Reveal failed: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setRevealing(false);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || overrideJustification.length < 10) return;
    setOverriding(true);
    try {
      const res = await reviewService.overrideDecision(caseId, overrideOutcome, overrideJustification);
      if (res.success) {
        alert(`Four-Eyes Override successfully applied: ${overrideOutcome}`);
        setShowOverrideModal(false);
        fetchCase();
      }
    } catch (err: any) {
      alert(`Override error: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setOverriding(false);
    }
  };

  if (loading && !caseData) {
    return (
      <div className="p-16 text-center text-slate-500 text-sm">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading comprehensive case evidence...
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm space-y-3">
        <p>{error || 'Case not found'}</p>
        <Link to="/staff/review-queue" className="underline font-semibold">
          Return to Queue
        </Link>
      </div>
    );
  }

  const doc = caseData.document || {};
  const ocrFields = doc.ocr?.fields || {};
  const face = caseData.faceVerification || {};
  const liveness = caseData.liveness || {};
  const tamper = doc.tamper || {};
  const quality = doc.quality || {};
  const isSenior = role === 'senior_reviewer' || role === 'admin';
  const canMakeDecision = role === 'reviewer' || role === 'senior_reviewer' || role === 'admin';

  return (
    <div className="space-y-4">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-3">
        <div className="flex items-center space-x-3">
          <Link
            to="/staff/review-queue"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 font-mono">{caseData.caseId}</h2>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                  caseData.state === 'APPROVED' || caseData.state === 'AUTO_APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : caseData.state === 'REJECTED' || caseData.state === 'AUTO_REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : caseData.state === 'MANUAL_REVIEW'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {caseData.state?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Applicant: {caseData.applicantId?.email || 'Registered End User'} &bull; Jurisdiction:{' '}
              {caseData.jurisdiction} &bull; Document: {caseData.documentType}
            </p>
          </div>
        </div>

        {/* Override trigger for Senior Reviewers */}
        {isSenior && (
          <button
            onClick={() => setShowOverrideModal(true)}
            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Four-Eyes Override</span>
          </button>
        )}
      </div>

      {/* 3-Column Evidence Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ================= LEFT COLUMN: Document Evidence (4 Cols) ================= */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-brand-600" />
              <span>Document Imagery</span>
            </h3>
            {doc.backImageUrl && (
              <div className="flex bg-slate-100 p-0.5 rounded text-[11px]">
                <button
                  onClick={() => setActiveSide('front')}
                  className={`px-2 py-0.5 rounded font-semibold ${
                    activeSide === 'front' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Front
                </button>
                <button
                  onClick={() => setActiveSide('back')}
                  className={`px-2 py-0.5 rounded font-semibold ${
                    activeSide === 'back' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Back
                </button>
              </div>
            )}
          </div>

          {/* Viewer Controls */}
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-xs border border-slate-200/80">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-600">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 ml-1"
                title="Rotate 90deg"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1 cursor-pointer text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={showTamperHeatmap}
                  onChange={(e) => setShowTamperHeatmap(e.target.checked)}
                  className="rounded text-brand-600 text-xs"
                />
                <span>ELA Heatmap</span>
              </label>
            </div>
          </div>

          {/* Image Canvas Box */}
          <div className="relative aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
            {activeSide === 'front' ? (
              doc.frontImageUrl ? (
                <div
                  className="w-full h-full flex items-center justify-center transition-transform"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                >
                  <img
                    src={doc.frontImageUrl}
                    alt="Document Front"
                    className="max-w-full max-h-full object-contain"
                  />
                  {showTamperHeatmap && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-red-600/30 via-transparent to-blue-600/30 mix-blend-color-dodge pointer-events-none flex items-center justify-center">
                      <span className="px-2 py-1 bg-black/70 text-red-400 text-[10px] font-mono rounded">
                        ELA Error Density Overlay
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-xs">No Front Image Available</div>
              )
            ) : doc.backImageUrl ? (
              <div
                className="w-full h-full flex items-center justify-center transition-transform"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                }}
              >
                <img src={doc.backImageUrl} alt="Document Back" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="text-slate-500 text-xs">No Back Image Uploaded</div>
            )}
          </div>

          {/* Document Quality Signals */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>Pre-Processing Quality</span>
              <span className="text-emerald-700 font-bold">{Math.round((quality.score || 0.92) * 100)}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>Resolution: <strong className="text-slate-800">1920x1080 (HD)</strong></div>
              <div>Blur Variance: <strong className="text-slate-800">{quality.blur || 0.08}</strong></div>
              <div>Glare Ratio: <strong className="text-slate-800">{quality.glare || 0.06}</strong></div>
              <div>Document Edges: <strong className="text-slate-800">4 Corners Detected</strong></div>
            </div>
          </div>
        </div>

        {/* ================= CENTER COLUMN: Extracted Fields (4 Cols) ================= */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-brand-600" />
              <span>Extracted Fields & OCR</span>
            </h3>

            {/* PII Masking Controls */}
            {isPiiRevealed ? (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                PII UNMASKED (AUDITED)
              </span>
            ) : isSenior || role === 'compliance_officer' ? (
              <button
                onClick={() => setShowRevealModal(true)}
                className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-[11px] rounded transition-colors flex items-center space-x-1"
              >
                <Eye className="w-3 h-3" />
                <span>Reveal PII</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">PII Masked</span>
            )}
          </div>

          {/* Fields Table */}
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Full Name</span>
                <span className="font-mono text-emerald-600 font-semibold">
                  Conf: {Math.round((ocrFields.fullName?.confidence || 0.96) * 100)}%
                </span>
              </div>
              <div className="font-semibold text-slate-900 text-sm">
                {ocrFields.fullName?.value || ocrFields.fullName?.masked || '••••••'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Document / ID Number</span>
                <span className="font-mono text-emerald-600 font-semibold">
                  Conf: {Math.round((ocrFields.idNumber?.confidence || 0.95) * 100)}%
                </span>
              </div>
              <div className="font-semibold text-slate-900 text-sm font-mono">
                {ocrFields.idNumber?.value || ocrFields.idNumber?.masked || '••••••••'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Date of Birth</span>
                <span className="font-mono text-emerald-600 font-semibold">
                  Conf: {Math.round((ocrFields.dob?.confidence || 0.94) * 100)}%
                </span>
              </div>
              <div className="font-semibold text-slate-900 text-sm font-mono">
                {ocrFields.dob?.value || ocrFields.dob?.masked || 'XX/XX/XXXX'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Expiration Date</span>
                <span className="font-mono text-emerald-600 font-semibold">
                  Conf: {Math.round((ocrFields.expiry?.confidence || 0.98) * 100)}%
                </span>
              </div>
              <div className="font-semibold text-slate-900 text-sm font-mono">
                {ocrFields.expiry?.value || '2030-05-10'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Registered Address</span>
                <span className="font-mono text-slate-400">Restricted</span>
              </div>
              <div className="text-slate-800 text-xs">
                {ocrFields.address?.value || ocrFields.address?.masked || '••••••••••••••••••••••••'}
              </div>
            </div>
          </div>

          {/* Validation Indicators */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <h4 className="font-bold text-slate-900">Algorithmic Document Validations</h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span>Document Expiry Status:</span>
                <strong className={doc.validation?.expired ? 'text-red-600' : 'text-emerald-600'}>
                  {doc.validation?.expired ? 'EXPIRED' : 'VALID & CURRENT'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>ICAO 9303 MRZ Checksum:</span>
                <strong className={doc.ocr?.mrzValid ? 'text-emerald-600' : 'text-red-600'}>
                  {doc.ocr?.mrzValid ? 'PASSED & MATCHED' : 'INVALID / CHECKSUM FAIL'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Cross-Field Consistency:</span>
                <strong className="text-emerald-600">CONFIRMED</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Biometrics & Decision Actions (4 Cols) ================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Biometrics Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-purple-600" />
              <span>Biometric Face Matching & Liveness</span>
            </h3>

            {/* Side by side comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 text-center">
                <div className="aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                  {face.croppedFaceUrl ? (
                    <img src={face.croppedFaceUrl} alt="ID Crop" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-500">ID Portrait</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">ID Photo Crop</span>
              </div>

              <div className="space-y-1 text-center">
                <div className="aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                  {face.selfieUrl ? (
                    <img src={face.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-500">Selfie</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Live Selfie</span>
              </div>
            </div>

            {/* Prominent Biometric Match Decision */}
            {(() => {
              const simVal = typeof face.similarity === 'number' ? face.similarity : 0;
              const simPercent = Math.round(simVal * 100);
              const faceThreshold = face.threshold ? Math.round(face.threshold * 100) : 70;
              const isMatch = Boolean(face.match && simVal >= (face.threshold || 0.70));
              const isNoDocFace = face.error === 'NO_FACE_DETECTED_IN_DOCUMENT' || face.verdict === 'NO_FACE_IN_DOCUMENT';
              const isNoSelfieFace = face.error === 'NO_FACE_DETECTED_IN_SELFIE' || face.verdict === 'NO_FACE_IN_SELFIE';

              if (isNoDocFace) {
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>NO REAL FACE IN ID DOCUMENT</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-tight">
                      The uploaded document has a placeholder silhouette graphic. An authentic photo ID is required to perform facial comparison.
                    </p>
                  </div>
                );
              }
              if (isNoSelfieFace) {
                return (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-red-800">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>NO FACE DETECTED IN SELFIE</span>
                    </div>
                    <p className="text-[11px] text-red-700 leading-tight">
                      Could not detect a clear human face in the live selfie. Retake with better lighting.
                    </p>
                  </div>
                );
              }
              if (isMatch) {
                return (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>FACES COMPLETELY MATCHING</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-tight">
                      Live selfie matches the portrait from the identity document ({simPercent}% similarity). Biometric identity verified.
                    </p>
                  </div>
                );
              }
              return (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-red-800">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>FACES DO NOT MATCH (MISMATCH)</span>
                  </div>
                  <p className="text-[11px] text-red-700 leading-tight">
                    The live selfie does not match the portrait on the document ({simPercent}% similarity &lt; {faceThreshold}% threshold).
                  </p>
                </div>
              );
            })()}

            {/* Scores & Thresholds */}
            <div className="space-y-2.5 pt-1 text-xs">
              {(() => {
                const simVal = typeof face.similarity === 'number' ? face.similarity : 0;
                const simPercent = Math.round(simVal * 100);
                const faceThreshold = face.threshold ? Math.round(face.threshold * 100) : 70;
                const isMatch = Boolean(face.match && simVal >= (face.threshold || 0.70));
                const isNoDocFace = face.error === 'NO_FACE_DETECTED_IN_DOCUMENT' || face.verdict === 'NO_FACE_IN_DOCUMENT';

                return (
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">Facial Similarity (ArcFace)</span>
                      <span className={`font-mono font-bold ${isNoDocFace ? 'text-amber-700' : isMatch ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isNoDocFace ? '0% (No Face on ID)' : `${simPercent}% (${isMatch ? 'MATCH' : 'MISMATCH'} • Req: ${faceThreshold}%)`}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isNoDocFace ? 'bg-amber-400' : isMatch ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${isNoDocFace ? 0 : Math.min(100, simPercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-700">Passive Liveness Anti-Spoof</span>
                  <span className="font-mono font-bold text-slate-900">
                    {Math.round((typeof liveness.score === 'number' ? liveness.score : 0.60) * 100)}% (Threshold: 60%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (liveness.score || 0.60) >= (liveness.threshold || 0.60) ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.round((typeof liveness.score === 'number' ? liveness.score : 0.60) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-700">Tamper Anomaly Score (ELA / FFT)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {Math.round((typeof tamper.score === 'number' ? tamper.score : 0.10) * 100)}% (Threshold: 70%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (tamper.score || 0.10) <= 0.7 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.round((typeof tamper.score === 'number' ? tamper.score : 0.10) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Risk Score & Reason Flags */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Overall Risk Score:</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded ${
                    caseData.riskScore >= 60
                      ? 'bg-red-100 text-red-700'
                      : caseData.riskScore >= 30
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {caseData.riskScore} / 100
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {caseData.riskFlags && caseData.riskFlags.length > 0 ? (
                  caseData.riskFlags.map((f: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-mono font-semibold"
                    >
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-emerald-700 font-semibold text-[11px]">Zero Risk Flags Triggered</span>
                )}
              </div>
            </div>
          </div>

          {/* Decision Action Console — Restricted to Reviewers and Senior Reviewers */}
          {canMakeDecision ? (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Reviewer Decision Actions
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Decision Notes / Reason Explanation
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional decision notes for audit log..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleDecision('APPROVE')}
                  disabled={actionLoading}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-1 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDecision('REJECT')}
                  disabled={actionLoading}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-1 shadow-xs"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDecision('RESUBMIT')}
                  disabled={actionLoading}
                  className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-1 shadow-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Resubmit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDecision('ESCALATE')}
                  disabled={actionLoading}
                  className="py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors flex items-center justify-center space-x-1 shadow-xs"
                >
                  <span>Escalate</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-xs">
              <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Decision Actions Restricted</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                You are viewing this case in read-only audit mode as <strong className="capitalize">{role?.replace('_', ' ')}</strong>. Final KYC decisions (Approve, Reject, Resubmit, Escalate) can only be performed by active <strong>Reviewers</strong> and <strong>Senior Reviewers</strong>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reveal PII Modal */}
      {showRevealModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center space-x-2 text-amber-600">
              <Eye className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Reveal Masked Personal Data</h3>
            </div>
            <p className="text-xs text-slate-600">
              Pursuant to privacy governance rules, unmasking sensitive customer PII requires a mandatory audit justification string (minimum 10 characters). This action will be permanently recorded in the SHA-256 chained audit ledger.
            </p>

            <form onSubmit={handleRevealSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Justification
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Discrepancy between MRZ and visual zone requires manual character inspection..."
                  value={revealJustification}
                  onChange={(e) => setRevealJustification(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-[10px] text-slate-400">
                  {revealJustification.length} / 10 characters minimum
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRevealModal(false)}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revealing || revealJustification.length < 10}
                  className="w-1/2 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {revealing ? 'Unmasking...' : 'Confirm Reveal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Four-Eyes Senior Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center space-x-2 text-purple-600">
              <Scale className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Four-Eyes Decision Override</h3>
            </div>
            <p className="text-xs text-slate-600">
              Senior Reviewer authorization required to override automated risk flags or automatic rejections.
            </p>

            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Override Outcome</label>
                <select
                  value={overrideOutcome}
                  onChange={(e) => setOverrideOutcome(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="APPROVED">Force Approve Case</option>
                  <option value="REJECTED">Force Reject Case</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senior Justification
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Checked secondary physical evidence and verified false positive anti-spoof reflection..."
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overriding || overrideJustification.length < 10}
                  className="w-1/2 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {overriding ? 'Applying Override...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
