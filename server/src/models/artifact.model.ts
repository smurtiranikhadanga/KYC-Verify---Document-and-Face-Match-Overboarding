import mongoose, { Schema, Document } from 'mongoose';
import { ArtifactKind } from '../types/shared.js';

export interface IArtifact extends Document {
  caseId: string;
  kind: ArtifactKind;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  kmsKeyId?: string;
  deleteAfter?: Date;
  createdAt: Date;
}

const ArtifactSchema = new Schema<IArtifact>(
  {
    caseId: { type: String, required: true, index: true },
    kind: {
      type: String,
      required: true,
      enum: ['id_front', 'id_back', 'selfie', 'liveness_video', 'evidence'],
    },
    storageKey: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true },
    kmsKeyId: { type: String, default: 'local-kms-dev-key' },
    deleteAfter: { type: Date },
  },
  { timestamps: true }
);

ArtifactSchema.index({ caseId: 1, kind: 1 });

export const Artifact = mongoose.model<IArtifact>('Artifact', ArtifactSchema);
