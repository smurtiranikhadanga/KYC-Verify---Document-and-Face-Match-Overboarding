# Database Design

**Primary store:** MongoDB (structured metadata, results). **Blob store:** S3-compatible object storage (raw artifacts). Security/field-level rules: `Database structure and access control.md`.

## 1. Principles
- Keep DB lean: no images/videos in Mongo; store S3 keys + hashes.
- **Embed** data read together and bounded (OCR fields, scores, check results) in the case document → avoids `$lookup`, one read to render a case.
- **Reference** unbounded/high-cardinality data (audit events, per-user verification history, review actions).
- Respect 16 MiB document limit; never embed unbounded arrays.
- Indexes follow real query patterns and the **ESR rule** (Equality → Sort → Range); verify with `explain()` (aim for IXSCAN, low `totalKeysExamined`, no COLLSCAN).

## 2. Deployment
- Replica set, **≥ 3 members**, via official MongoDB Kubernetes Operator; dedicated `db` node pool, anti-affinity; PVCs on SSD.
- TLS between members/clients; auth via SCRAM or x.509; encryption at rest (volume-level + field-level for high-sensitivity fields via client-side field-level encryption keyed from Vault/KMS).
- Write concern `majority` for state transitions and consent/audit; read concern `majority` where correctness-critical.
- Sharding: **not at start**. Plan shard key (hashed `caseId` or `userId`) if data/throughput exceeds a replica set; choose high-cardinality, evenly distributed, query-aligned keys.
- Backups: scheduled snapshots + oplog for point-in-time restore; restore drills each quarter; backup retention aligned with erasure policy (documented expiry of erased data from backups).

## 3. Collections overview
| Collection | Purpose | Growth |
|---|---|---|
| `applicants` | Minimal identity/contact + status | per user |
| `kyc_cases` | **Core document**: state, embedded OCR/face/liveness/tamper/decision | per attempt |
| `artifacts` | Pointers to S3 objects (type, key, hash, size, KMS key id) | many per case (referenced) |
| `consents` | Immutable consent ledger | per consent event |
| `review_tasks` | Manual review queue/locks/decisions | per flagged case |
| `audit_logs` | Append-only, hash-chained events | very high |
| `dsar_requests` | Access/erasure requests & certificates | low |
| `policies` | Versioned decision thresholds, retention rules | low |
| `staff_users`, `roles`, `role_bindings` | Staff identity mapping & RBAC | low |
| `verification_sessions` | Short-lived sessions/challenges (**TTL**) | transient |
| `failed_attempts` | Rate-limit/abuse signals (**TTL**) | transient |
| `model_runs` | Per-inference lineage: model versions, scores, latency (no PII) | high |
| `analytics_daily` | Pre-aggregated KPIs | low |
| `drift_reports` | Evidently outputs metadata | low |

## 4. Core document: `kyc_cases` (sketch)
```jsonc
{
  "_id": "case_01H...",
  "applicantId": "app_...",
  "region": "eu-west",
  "jurisdiction": "DE",
  "riskTier": "standard",
  "state": "MANUAL_REVIEW",
  "stateHistory": [{ "state": "CONSENTED", "at": ISODate, "by": "system" }],  // bounded (≤ ~30)
  "consentIds": ["cons_..."],
  "document": {
    "type": "passport", "issuingCountry": "DE",
    "artifactIds": ["art_front", "art_back"],
    "ocr": {
      "engine": "paddleocr", "version": "3.x",
      "fields": {
        "fullName": { "valueEnc": "<field-level encrypted>", "conf": 0.97 },
        "dob":      { "valueEnc": "...", "conf": 0.95 },
        "idNumber": { "valueEnc": "...", "conf": 0.93, "last4": "1234" },
        "expiry":   { "value": "2030-05-01", "conf": 0.96 }
      },
      "mrzValid": true
    },
    "validation": { "expired": false, "formatOk": true, "crossFieldOk": true },
    "tamper": { "ela": 0.12, "fft": 0.08, "metadataFlags": [], "score": 0.1 },
    "quality": { "blur": 0.9, "glare": 0.1, "score": 0.88 }
  },
  "face": {
    "model": "ArcFace", "detector": "retinaface", "modelVersion": "...",
    "distance": 0.31, "threshold": 0.68, "match": true
  },
  "liveness": { "passive": { "score": 0.91, "modelVersion": "..." }, "active": { "required": false } },
  "decision": {
    "outcome": "MANUAL_REVIEW", "reasonCodes": ["LIVENESS_BORDERLINE"],
    "policyVersion": 12, "decidedAt": ISODate, "priority": 70
  },
  "retention": { "deleteAfter": ISODate, "legalHold": false },
  "createdAt": ISODate, "updatedAt": ISODate, "schemaVersion": 3
}
```
Distances/thresholds depend on the DeepFace model and metric; store both so decisions are explainable and re-evaluable.

## 5. Other schemas (key fields)
- `consents`: `_id, applicantId, type(biometric|general|marketing), policyVersion, textHash, granted, signatureName, ipHash, userAgentHash, at, withdrawnAt`. **Insert-only**; withdrawal adds an event rather than mutating history.
- `artifacts`: `_id, caseId, kind(id_front|id_back|selfie|liveness_video|evidence), s3Key, sha256, sizeBytes, kmsKeyId, createdAt, deleteAfter`.
- `review_tasks`: `_id, caseId, status, priority, claimedBy, claimExpiresAt, decision, reasonCodes, secondReviewer, createdAt, slaDueAt`.
- `audit_logs`: `_id, ts, actor{type,id,role}, action, resource{type,id}, outcome, ipHash, reqId, prevHash, hash`. Hash chain = tamper evidence; also streamed to SIEM.
- `verification_sessions`: `{ _id, applicantId, challenge, nonce, expireAt }` with TTL.

## 6. Index plan
| Collection | Index | Reason |
|---|---|---|
| `kyc_cases` | `{ applicantId:1, createdAt:-1 }` | applicant history |
| `kyc_cases` | `{ state:1, "decision.priority":-1, createdAt:1 }` | reviewer/ops queries (E,S,R) |
| `kyc_cases` | `{ "retention.deleteAfter":1 }` partial `{ "retention.legalHold": false }` | retention sweeps |
| `artifacts` | `{ caseId:1, kind:1 }` | fetch case evidence |
| `consents` | `{ applicantId:1, type:1, at:-1 }` | latest consent state |
| `review_tasks` | `{ status:1, priority:-1, slaDueAt:1 }` | queue |
| `review_tasks` | `{ claimedBy:1, status:1 }` | my cases |
| `audit_logs` | `{ "resource.id":1, ts:-1 }`, `{ "actor.id":1, ts:-1 }` | investigations |
| `verification_sessions` | `{ expireAt:1 }` TTL `expireAfterSeconds:0` | auto-expire |
| `failed_attempts` | `{ createdAt:1 }` TTL | auto-expire |
| `applicants` | `{ emailHash:1 }` unique, partial on active | lookup w/o storing plaintext index |
**Avoid** wildcard indexes in production; text indexes on OCR text only if reviewers truly need search (it is sensitive: restrict and encrypt).

## 7. Object storage layout
```
s3://kyc-{region}-{env}/
  cases/{caseId}/raw/id_front.jpg
  cases/{caseId}/raw/id_back.jpg
  cases/{caseId}/raw/selfie.jpg | liveness.webm
  cases/{caseId}/evidence/ela_heatmap.png | face_crop_id.png | face_crop_selfie.png
```
- Bucket: block public access, versioning, SSE-KMS (per-region key), TLS-only policy, access via pre-signed URLs with short expiry (minutes) for reviewers, VPC endpoints.
- Lifecycle: raw → delete at `deleteAfter`; evidence follows case; incomplete multipart cleanup.
- Never put PII in object keys.

## 8. Data lifecycle & retention
| Data class | Default retention (set by compliance per jurisdiction) | End action |
|---|---|---|
| Raw biometric (selfie/video) | Shortest lawful (e.g., delete after decision + dispute window) | Hard delete S3 + embeddings |
| ID images | Per AML record-keeping law | Delete/archive |
| Extracted fields/decision | Per AML law | Pseudonymize/delete |
| Consent ledger | Life of processing + limitation period | Archive |
| Audit logs | Per policy (often years) | Archive |
| Sessions/failed attempts | Hours-days | TTL |
Public retention schedule document required for BIPA-style compliance.

## 9. Migrations & change management
Schema versioned via `schemaVersion`; migrations are idempotent scripts run through CI; additive-first; backwards-compatible readers for one release.

## 10. Performance checklist
Run `explain("executionStats")` on all hot queries each spiral; fail CI if COLLSCAN on indexed collections in integration tests; monitor slow-query log; keep working set in RAM; review index count vs write cost.
