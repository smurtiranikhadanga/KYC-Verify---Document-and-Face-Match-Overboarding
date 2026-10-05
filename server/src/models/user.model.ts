import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'applicant' | 'reviewer' | 'senior_reviewer' | 'compliance_officer' | 'admin' | 'ml_engineer' | 'auditor';
  department?: string;
  region: string;
  jurisdictions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['applicant', 'reviewer', 'senior_reviewer', 'compliance_officer', 'admin', 'ml_engineer', 'auditor'],
      default: 'reviewer',
    },
    department: { type: String, default: 'Operations' },
    region: { type: String, default: 'global' },
    jurisdictions: { type: [String], default: ['*'] },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
