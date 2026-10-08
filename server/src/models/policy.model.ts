import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicy extends Document {
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
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PolicySchema = new Schema<IPolicy>(
  {
    name: { type: String, required: true },
    version: { type: Number, default: 1 },
    jurisdiction: { type: String, default: 'GLOBAL', index: true },
    riskTier: { type: String, enum: ['low', 'standard', 'high'], default: 'standard' },
    faceMatchThreshold: { type: Number, default: 0.55 },
    livenessThreshold: { type: Number, default: 0.60 },
    tamperThreshold: { type: Number, default: 0.70 },
    ocrConfidenceThreshold: { type: Number, default: 0.80 },
    autoApproveAllowed: { type: Boolean, default: true },
    activeLivenessRequired: { type: Boolean, default: false },
    retentionDaysBiometric: { type: Number, default: 30 },
    retentionDaysId: { type: Number, default: 1825 }, // 5 years for AML
    updatedBy: { type: String, default: 'system' },
  },
  { timestamps: true }
);

export const Policy = mongoose.model<IPolicy>('Policy', PolicySchema);
