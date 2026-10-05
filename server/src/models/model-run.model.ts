import mongoose, { Schema, Document } from 'mongoose';

export interface IModelRun extends Document {
  runId: string;
  caseId: string;
  stage: 'OCR' | 'FACE' | 'LIVENESS' | 'TAMPER';
  modelName: string;
  modelVersion: string;
  latencyMs: number;
  inputStats: {
    blur?: number;
    glare?: number;
    resolution?: string;
  };
  metrics: Record<string, any>;
  timestamp: Date;
}

const ModelRunSchema = new Schema<IModelRun>(
  {
    runId: { type: String, required: true, unique: true, index: true },
    caseId: { type: String, required: true, index: true },
    stage: { type: String, enum: ['OCR', 'FACE', 'LIVENESS', 'TAMPER'], required: true, index: true },
    modelName: { type: String, required: true },
    modelVersion: { type: String, required: true },
    latencyMs: { type: Number, required: true },
    inputStats: {
      blur: Number,
      glare: Number,
      resolution: String,
    },
    metrics: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const ModelRun = mongoose.model<IModelRun>('ModelRun', ModelRunSchema);
