import mongoose, { Schema, Document } from 'mongoose';
import { DSARType, DSARStatus } from '../types/shared.js';

export interface IDSARRequest extends Document {
  requestId: string;
  applicantId?: mongoose.Types.ObjectId;
  email: string;
  type: DSARType;
  status: DSARStatus;
  requestedAt: Date;
  slaDueAt: Date;
  executedAt?: Date;
  executedBy?: mongoose.Types.ObjectId;
  reason?: string;
  completionCertificate?: {
    certificateId: string;
    erasedArtifactCount: number;
    erasedCaseCount: number;
    hashProof: string;
    timestamp: Date;
  };
}

const DSARRequestSchema = new Schema<IDSARRequest>(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant' },
    email: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, enum: ['ACCESS', 'DELETION', 'CORRECTION'], required: true },
    status: {
      type: String,
      enum: ['SUBMITTED', 'VERIFIED', 'IN_REVIEW', 'COMPLETED', 'REJECTED'],
      default: 'SUBMITTED',
      index: true,
    },
    requestedAt: { type: Date, default: Date.now },
    slaDueAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // 30-day GDPR SLA
    executedAt: { type: Date },
    executedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    completionCertificate: {
      certificateId: { type: String },
      erasedArtifactCount: { type: Number },
      erasedCaseCount: { type: Number },
      hashProof: { type: String },
      timestamp: { type: Date },
    },
  },
  { timestamps: true }
);

export const DSARRequest = mongoose.model<IDSARRequest>('DSARRequest', DSARRequestSchema);
