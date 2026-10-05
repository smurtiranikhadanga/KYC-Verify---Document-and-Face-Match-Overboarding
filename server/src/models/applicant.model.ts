import mongoose, { Schema, Document } from 'mongoose';

export interface IApplicant extends Document {
  email?: string;
  phone?: string;
  emailHash?: string;
  phoneHash?: string;
  status: 'active' | 'suspended' | 'erased';
  currentCaseId?: string;
  country?: string;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicantSchema = new Schema<IApplicant>(
  {
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    emailHash: { type: String, index: true },
    phoneHash: { type: String, index: true },
    status: { type: String, enum: ['active', 'suspended', 'erased'], default: 'active' },
    currentCaseId: { type: String },
    country: { type: String, default: 'IN' },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Applicant = mongoose.model<IApplicant>('Applicant', ApplicantSchema);
