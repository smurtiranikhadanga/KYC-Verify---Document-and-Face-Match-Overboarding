import mongoose, { Schema, Document } from 'mongoose';
import { ConsentType } from '../types/shared.js';

export interface IConsent extends Document {
  applicantId: mongoose.Types.ObjectId;
  caseId?: string;
  type: ConsentType;
  policyVersion: number;
  textHash: string;
  consentText: string;
  granted: boolean;
  signatureName: string;
  ipHash: string;
  userAgentHash: string;
  at: Date;
  withdrawnAt?: Date;
  withdrawalReason?: string;
}

const ConsentSchema = new Schema<IConsent>(
  {
    applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant', required: true, index: true },
    caseId: { type: String, index: true },
    type: {
      type: String,
      required: true,
      enum: ['biometric', 'general', 'marketing'],
      default: 'biometric',
    },
    policyVersion: { type: Number, default: 1 },
    textHash: { type: String, required: true },
    consentText: { type: String, required: true },
    granted: { type: Boolean, required: true },
    signatureName: { type: String, required: true },
    ipHash: { type: String, required: true },
    userAgentHash: { type: String, required: true },
    at: { type: Date, default: Date.now },
    withdrawnAt: { type: Date },
    withdrawalReason: { type: String },
  },
  { timestamps: true }
);

ConsentSchema.index({ applicantId: 1, type: 1, at: -1 });

export const Consent = mongoose.model<IConsent>('Consent', ConsentSchema);
