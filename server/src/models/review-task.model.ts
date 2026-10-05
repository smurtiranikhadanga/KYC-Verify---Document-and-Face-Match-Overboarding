import mongoose, { Schema, Document } from 'mongoose';
import { ReviewTaskStatus, DecisionOutcome } from '../types/shared.js';

export interface IReviewTask extends Document {
  caseId: string;
  status: ReviewTaskStatus;
  priority: number;
  claimedBy?: mongoose.Types.ObjectId;
  claimExpiresAt?: Date;
  decision?: DecisionOutcome;
  reasonCodes?: string[];
  notes?: string;
  secondReviewer?: mongoose.Types.ObjectId;
  overrideRequested?: boolean;
  slaDueAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewTaskSchema = new Schema<IReviewTask>(
  {
    caseId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'CLAIMED', 'COMPLETED', 'ESCALATED'],
      default: 'PENDING',
      index: true,
    },
    priority: { type: Number, default: 50, index: true },
    claimedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    claimExpiresAt: { type: Date },
    decision: {
      type: String,
      enum: ['AUTO_APPROVED', 'MANUAL_REVIEW', 'AUTO_REJECTED', 'NEEDS_RESUBMISSION', 'APPROVED', 'REJECTED'],
    },
    reasonCodes: [{ type: String }],
    notes: { type: String },
    secondReviewer: { type: Schema.Types.ObjectId, ref: 'User' },
    overrideRequested: { type: Boolean, default: false },
    slaDueAt: { type: Date, default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) }, // 2hr SLA
  },
  { timestamps: true }
);

ReviewTaskSchema.index({ status: 1, priority: -1, slaDueAt: 1 });
ReviewTaskSchema.index({ claimedBy: 1, status: 1 });

export const ReviewTask = mongoose.model<IReviewTask>('ReviewTask', ReviewTaskSchema);
