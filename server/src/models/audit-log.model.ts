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
  seq: number;
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
    seq: { type: Number, required: true, unique: true },
    prevHash: { type: String, required: true },
    hash: { type: String, required: true },
  },
  { timestamps: false } // No auto-updatedAt to guarantee immutability
);

AuditLogSchema.index({ 'resource.id': 1, timestamp: -1 });
AuditLogSchema.index({ 'actor.id': 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// Async queue to serialize audit log writes in this process
let auditQueue: Promise<any> = Promise.resolve();

/**
 * Creates and appends a verified hash-chained audit log entry
 */
export function createAuditEntry(params: {
  actor: { id?: string; type: 'user' | 'applicant' | 'system'; role?: string; email?: string };
  action: string;
  resource: { type: string; id: string };
  outcome?: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ipHash?: string;
  reqId?: string;
  metadata?: Record<string, any>;
}): Promise<IAuditLog> {
  auditQueue = auditQueue.then(async () => {
    // Retry loop for cross-process concurrency (MongoDB unique index on seq)
    for (let attempts = 0; attempts < 3; attempts++) {
      try {
        const lastEntry = await AuditLog.findOne().sort({ seq: -1 });
        const prevHash = lastEntry ? lastEntry.hash : 'GENESIS_HASH_KYC_FLOW_0000000000000000000000000000000000000000';
        const seq = lastEntry ? lastEntry.seq + 1 : 1;
        const timestamp = new Date();

        // FIX N-21: Mask the IP using a salt/pepper instead of raw IPv4 SHA-256
        const pepper = process.env.AUDIT_HMAC_SECRET || 'kyc-audit-secret-fallback';
        let secureIpHash = 'unknown';
        if (params.ipHash && params.ipHash !== 'unknown' && params.ipHash !== '127.0.0.1') {
          // If the caller already hashed it unkeyed, we re-HMAC it. If they passed raw IP, we HMAC it.
          secureIpHash = crypto.createHmac('sha256', pepper).update(params.ipHash).digest('hex');
        } else if (params.ipHash === '127.0.0.1') {
          secureIpHash = '127.0.0.1';
        }

        const rawPayload = JSON.stringify({
          seq,
          prevHash,
          timestamp: timestamp.toISOString(),
          actor: params.actor,
          action: params.action,
          resource: params.resource,
          outcome: params.outcome || 'SUCCESS',
          ipHash: secureIpHash,
          metadata: params.metadata || {},
        });

        // FIX N-21: Use HMAC instead of unkeyed SHA-256 to prevent chain recalculation
        const hash = crypto.createHmac('sha256', pepper).update(rawPayload).digest('hex');

        const entry = new AuditLog({
          timestamp,
          actor: params.actor,
          action: params.action,
          resource: params.resource,
          outcome: params.outcome || 'SUCCESS',
          ipHash: secureIpHash,
          reqId: params.reqId,
          metadata: params.metadata,
          seq,
          prevHash,
          hash,
        });

        return await entry.save();
      } catch (err: any) {
        if (err.code === 11000) {
          // Duplicate seq, another process wrote. Retry.
          continue;
        }
        throw err;
      }
    }
    throw new Error('Failed to append audit log after retries (concurrency conflict)');
  }).catch(err => {
    console.error('AuditLog Write Error:', err);
    throw err;
  });
  
  return auditQueue;
}
