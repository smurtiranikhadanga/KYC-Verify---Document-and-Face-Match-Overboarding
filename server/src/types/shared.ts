// Core shared types for KYC-Flow

export type CaseState =
  | 'CREATED'
  | 'CONSENTED'
  | 'DOCS_UPLOADED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'AUTO_APPROVED'
  | 'MANUAL_REVIEW'
  | 'AUTO_REJECTED'
  | 'NEEDS_RESUBMISSION'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'ERASED'
  | 'PROCESSING_FAILED';

export type UserRole =
  | 'applicant'
  | 'reviewer'
  | 'senior_reviewer'
  | 'compliance_officer'
  | 'admin'
  | 'ml_engineer'
  | 'auditor';

export type DocumentType = 'passport' | 'national_id' | 'driver_license';

export type ConsentType = 'biometric' | 'general' | 'marketing';

export type ArtifactKind = 'id_front' | 'id_back' | 'selfie' | 'liveness_video' | 'evidence';

export type DSARType = 'ACCESS' | 'DELETION' | 'CORRECTION';
export type DSARStatus = 'SUBMITTED' | 'VERIFIED' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';

export type ReviewTaskStatus = 'PENDING' | 'CLAIMED' | 'COMPLETED' | 'ESCALATED';

export type DecisionOutcome =
  | 'AUTO_APPROVED'
  | 'MANUAL_REVIEW'
  | 'AUTO_REJECTED'
  | 'NEEDS_RESUBMISSION'
  | 'APPROVED'
  | 'REJECTED';

export interface StateHistoryItem {
  state: CaseState;
  at: string;
  by: string;
  notes?: string;
}

export interface OCRField {
  value: string;
  confidence: number;
  box?: [number, number, number, number];
  masked?: string;
  isMasked?: boolean;
}

export interface CaseDocumentData {
  type: DocumentType;
  issuingCountry: string;
  artifactIds: string[];
  frontImageUrl?: string;
  backImageUrl?: string;
  ocr: {
    engine: string;
    version: string;
    fields: {
      fullName: OCRField;
      dob: OCRField;
      idNumber: OCRField;
      expiry: OCRField;
      address?: OCRField;
    };
    mrzValid: boolean;
    rawText?: string;
  };
  validation: {
    expired: boolean;
    formatOk: boolean;
    crossFieldOk: boolean;
  };
  tamper: {
    ela: number;
    fft: number;
    metadataFlags: string[];
    score: number;
    flagged: boolean;
  };
  quality: {
    blur: number;
    glare: number;
    brightness: number;
    score: number;
    passed: boolean;
    feedback?: string;
  };
}

export interface CaseFaceData {
  model: string;
  detector: string;
  similarity: number;
  distance: number;
  threshold: number;
  match: boolean;
  selfieUrl?: string;
  croppedFaceUrl?: string;
}

export interface CaseLivenessData {
  score: number;
  threshold: number;
  method: 'passive' | 'active' | 'hybrid';
  passed: boolean;
  challengeType?: 'turn_left' | 'turn_right' | 'blink' | 'nod' | 'none';
  challengeResult?: boolean;
}

export interface CaseDecisionData {
  outcome: DecisionOutcome;
  reasonCodes: string[];
  policyVersion: number;
  decidedAt: string;
  decidedBy: string;
  priority?: number;
  notes?: string;
  overrideReason?: string;
  seniorApprovedBy?: string;
  requiresSecondReview?: boolean;
}

export interface KycCaseSummary {
  _id: string;
  caseId: string;
  applicantId: string;
  region: string;
  jurisdiction: string;
  documentType: DocumentType;
  riskTier: 'low' | 'standard' | 'high';
  state: CaseState;
  riskScore: number;
  riskFlags: string[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  slaDueAt?: string;
  decision?: {
    outcome: DecisionOutcome;
    reasonCodes: string[];
    priority?: number;
  };
}

export interface PolicyConfig {
  _id?: string;
  name: string;
  version: number;
  jurisdiction: string;
  riskTier: 'low' | 'standard' | 'high';
  faceMatchThreshold: number;
  livenessThreshold: number;
  tamperThreshold: number;
  ocrConfidenceThreshold: number;
  autoApproveAllowed: boolean;
  activeLivenessRequired: boolean;
  retentionDaysBiometric: number;
  retentionDaysId: number;
  updatedAt: string;
  updatedBy: string;
}
