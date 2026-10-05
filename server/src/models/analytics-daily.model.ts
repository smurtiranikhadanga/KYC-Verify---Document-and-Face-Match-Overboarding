import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyticsDaily extends Document {
  date: string; // YYYY-MM-DD
  totalCases: number;
  autoApproved: number;
  manualReview: number;
  autoRejected: number;
  needsResubmission: number;
  approved: number;
  rejected: number;
  avgProcessingTimeMs: number;
  medianTimeToDecisionMinutes: number;
  p95TimeToDecisionMinutes: number;
  ocrAvgConfidence: number;
  faceAvgSimilarity: number;
  livenessAvgScore: number;
}

const AnalyticsDailySchema = new Schema<IAnalyticsDaily>(
  {
    date: { type: String, required: true, unique: true, index: true },
    totalCases: { type: Number, default: 0 },
    autoApproved: { type: Number, default: 0 },
    manualReview: { type: Number, default: 0 },
    autoRejected: { type: Number, default: 0 },
    needsResubmission: { type: Number, default: 0 },
    approved: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    avgProcessingTimeMs: { type: Number, default: 1200 },
    medianTimeToDecisionMinutes: { type: Number, default: 3.5 },
    p95TimeToDecisionMinutes: { type: Number, default: 8.2 },
    ocrAvgConfidence: { type: Number, default: 0.96 },
    faceAvgSimilarity: { type: Number, default: 0.91 },
    livenessAvgScore: { type: Number, default: 0.94 },
  },
  { timestamps: true }
);

export const AnalyticsDaily = mongoose.model<IAnalyticsDaily>(
  'AnalyticsDaily',
  AnalyticsDailySchema
);
