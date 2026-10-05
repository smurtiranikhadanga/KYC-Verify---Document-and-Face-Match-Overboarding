import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IAuditLog extends Document {
  timestamp: Date;
  actor: {
    id?: string;
    type: 'user' | 'applicant' | 'system';
    role?: string;
    email?: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
  };
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ipHash: string;
  reqId?: string;
  metadata?: Record<string, any>;
  prevHash: string;
  hash: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    actor: {
      id: { type: String },
      type: { type: String, enum: ['user', 'applicant', 'system'], default: 'system' },
      role: { type: String },
      email: { type: String },
    },
    action: { type: String, required: true, index: true },
    resource: {
      type: { type: String, required: true },
      id: { type: String, required: true },
    },
    outcome: { type: String, enum: ['SUCCESS', 'FAILURE', 'DENIED'], default: 'SUCCESS' },
    ipHash: { type: String, default: '127.0.0.1' },
    reqId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    prevHash: { type: String, required: true },
    hash: { type: String, required: true },
  },
  { timestamps: false } // No auto-updatedAt to guarantee immutability
);

AuditLogSchema.index({ 'resource.id': 1, timestamp: -1 });
AuditLogSchema.index({ 'actor.id': 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

/**
 * Creates and appends a verified hash-chained audit log entry
 */
export async function createAuditEntry(params: {
  actor: { id?: string; type: 'user' | 'applicant' | 'system'; role?: string; email?: string };
  action: string;
  resource: { type: string; id: string };
  outcome?: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ipHash?: string;
  reqId?: string;
  metadata?: Record<string, any>;
}): Promise<IAuditLog> {
  // Find last audit entry to get previous hash
  const lastEntry = await AuditLog.findOne().sort({ timestamp: -1, _id: -1 });
  const prevHash = lastEntry ? lastEntry.hash : 'GENESIS_HASH_KYC_FLOW_0000000000000000000000000000000000000000';

  const timestamp = new Date();
  const rawPayload = JSON.stringify({
    prevHash,
    timestamp: timestamp.toISOString(),
    actor: params.actor,
    action: params.action,
    resource: params.resource,
    outcome: params.outcome || 'SUCCESS',
    ipHash: params.ipHash || 'unknown',
    metadata: params.metadata || {},
  });

  const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

  const entry = new AuditLog({
    timestamp,
    actor: params.actor,
    action: params.action,
    resource: params.resource,
    outcome: params.outcome || 'SUCCESS',
    ipHash: params.ipHash || 'unknown',
    reqId: params.reqId,
    metadata: params.metadata,
    prevHash,
    hash,
  });

  return entry.save();
}
