import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationSession extends Document {
  sessionId: string;
  contactType: 'email' | 'phone';
  contactValue: string;
  otpCode: string;
  attempts: number;
  verified: boolean;
  applicantId?: mongoose.Types.ObjectId;
  caseId?: string;
  expiresAt: Date;
}

const VerificationSessionSchema = new Schema<IVerificationSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    contactType: { type: String, enum: ['email', 'phone'], required: true },
    contactValue: { type: String, required: true, lowercase: true, trim: true },
    otpCode: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant' },
    caseId: { type: String },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      index: { expires: 0 }, // TTL index
    },
  },
  { timestamps: true }
);

export const VerificationSession = mongoose.model<IVerificationSession>(
  'VerificationSession',
  VerificationSessionSchema
);
