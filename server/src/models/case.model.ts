import mongoose, { Schema, Document } from 'mongoose';
import { CaseState, DocumentType, DecisionOutcome } from '../types/shared.js';

export interface IKycCase extends Document {
  caseId: string;
  applicantId: mongoose.Types.ObjectId;
  region: string;
  jurisdiction: string;
  documentType: DocumentType;
  riskTier: 'low' | 'standard' | 'high';
  state: CaseState;
  stateHistory: Array<{
    state: CaseState;
    at: Date;
    by: string;
    notes?: string;
  }>;
  consentIds: mongoose.Types.ObjectId[];
  document: {
    type: DocumentType;
    issuingCountry: string;
    artifactIds: mongoose.Types.ObjectId[];
    frontImageUrl?: string;
    backImageUrl?: string;
    ocr: {
      engine: string;
      version: string;
      fields: {
        fullName: { value: string; confidence: number; box?: number[] };
        dob: { value: string; confidence: number; box?: number[] };
        idNumber: { value: string; confidence: number; box?: number[] };
        expiry: { value: string; confidence: number; box?: number[] };
        address?: { value: string; confidence: number; box?: number[] };
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
  };
  faceVerification: {
    model: string;
    detector: string;
    similarity: number;
    distance: number;
    threshold: number;
    match: boolean;
    confidence: number;
    selfieUrl?: string;
    croppedFaceUrl?: string;
    error?: string;
    verdict?: string;
    feedback?: string;
  };
  liveness: {
    score: number;
    threshold: number;
    method: 'passive' | 'active' | 'hybrid';
    passed: boolean;
    challengeType?: string;
    challengeResult?: boolean;
  };
  riskScore: number;
  riskFlags: string[];
  decision?: {
    outcome: DecisionOutcome;
    reasonCodes: string[];
    policyVersion: number;
    decidedBy: string;
    decidedAt: Date;
    priority?: number;
    notes?: string;
    overrideReason?: string;
    seniorApprovedBy?: string;
    requiresSecondReview?: boolean;
  };
  retention: {
    deleteAfter?: Date;
    legalHold: boolean;
  };
  assignedTo?: mongoose.Types.ObjectId;
  slaDueAt?: Date;
  submissionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const KycCaseSchema = new Schema<IKycCase>(
  {
    caseId: { type: String, required: true, unique: true, index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant', required: true, index: true },
    region: { type: String, default: 'eu-west' },
    jurisdiction: { type: String, default: 'IN', index: true },
    documentType: {
      type: String,
      enum: ['passport', 'national_id', 'driver_license'],
      default: 'passport',
    },
    riskTier: { type: String, enum: ['low', 'standard', 'high'], default: 'standard' },
    state: {
      type: String,
      required: true,
      enum: [
        'CREATED',
        'CONSENTED',
        'DOCS_UPLOADED',
        'SELFIE_UPLOADED',
        'QUEUED',
        'PROCESSING',
        'AUTO_APPROVED',
        'MANUAL_REVIEW',
        'AUTO_REJECTED',
        'NEEDS_RESUBMISSION',
        'APPROVED',
        'REJECTED',
        'ARCHIVED',
        'ERASED',
        'PROCESSING_FAILED',
      ],
      default: 'CREATED',
      index: true,
    },
    stateHistory: [
      {
        state: { type: String, required: true },
        at: { type: Date, default: Date.now },
        by: { type: String, default: 'system' },
        notes: { type: String },
      },
    ],
    consentIds: [{ type: Schema.Types.ObjectId, ref: 'Consent' }],
    document: {
      type: { type: String, default: 'passport' },
      issuingCountry: { type: String, default: 'IN' },
      artifactIds: [{ type: Schema.Types.ObjectId, ref: 'Artifact' }],
      frontImageUrl: { type: String },
      backImageUrl: { type: String },
      ocr: {
        engine: { type: String, default: 'paddleocr' },
        version: { type: String, default: '3.1.0' },
        fields: {
          fullName: { value: String, confidence: Number, box: [Number] },
          dob: { value: String, confidence: Number, box: [Number] },
          idNumber: { value: String, confidence: Number, box: [Number] },
          expiry: { value: String, confidence: Number, box: [Number] },
          address: { value: String, confidence: Number, box: [Number] },
        },
        mrzValid: { type: Boolean, default: true },
        rawText: { type: String },
      },
      validation: {
        expired: { type: Boolean, default: false },
        formatOk: { type: Boolean, default: true },
        crossFieldOk: { type: Boolean, default: true },
      },
      tamper: {
        ela: { type: Number, default: 0.08 },
        fft: { type: Number, default: 0.06 },
        metadataFlags: [{ type: String }],
        score: { type: Number, default: 0.07 },
        flagged: { type: Boolean, default: false },
      },
      quality: {
        blur: { type: Number, default: 0.1 },
        glare: { type: Number, default: 0.08 },
        brightness: { type: Number, default: 0.9 },
        score: { type: Number, default: 0.92 },
        passed: { type: Boolean, default: true },
        feedback: { type: String },
      },
    },
    faceVerification: {
      model: { type: String, default: 'ArcFace' },
      detector: { type: String, default: 'RetinaFace' },
      similarity: { type: Number, default: 0.92 },
      distance: { type: Number, default: 0.08 },
      threshold: { type: Number, default: 0.80 },
      match: { type: Boolean, default: true },
      confidence: { type: Number, default: 0.94 },
      selfieUrl: { type: String },
      croppedFaceUrl: { type: String },
      error: { type: String },
      verdict: { type: String },
      feedback: { type: String },
    },
    liveness: {
      score: { type: Number, default: 0.95 },
      threshold: { type: Number, default: 0.85 },
      method: { type: String, enum: ['passive', 'active', 'hybrid'], default: 'passive' },
      passed: { type: Boolean, default: true },
      challengeType: { type: String },
      challengeResult: { type: Boolean },
    },
    riskScore: { type: Number, default: 15 },
    riskFlags: [{ type: String }],
    decision: {
      outcome: {
        type: String,
        enum: ['AUTO_APPROVED', 'MANUAL_REVIEW', 'AUTO_REJECTED', 'NEEDS_RESUBMISSION', 'APPROVED', 'REJECTED'],
      },
      reasonCodes: [{ type: String }],
      policyVersion: { type: Number, default: 1 },
      decidedBy: { type: String, default: 'system' },
      decidedAt: { type: Date },
      priority: { type: Number, default: 50 },
      notes: { type: String },
      overrideReason: { type: String },
      seniorApprovedBy: { type: String },
      requiresSecondReview: { type: Boolean, default: false },
    },
    retention: {
      deleteAfter: { type: Date },
      legalHold: { type: Boolean, default: false },
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    slaDueAt: { type: Date },
    submissionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes following ESR Rule (Equality, Sort, Range)
KycCaseSchema.index({ applicantId: 1, createdAt: -1 });
KycCaseSchema.index({ state: 1, 'decision.priority': -1, createdAt: 1 });
KycCaseSchema.index({ assignedTo: 1, state: 1 });

export const KycCase = mongoose.model<IKycCase>('KycCase', KycCaseSchema);
