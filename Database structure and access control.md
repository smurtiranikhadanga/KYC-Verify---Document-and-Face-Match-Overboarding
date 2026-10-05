# Database Structure & Access Control

Defines **who/what can touch which collection and field**. Complements `Database.md` (shape) and `Access control systems.md` (identity & RBAC engine).

## 1. Principles
Least privilege; separation of duties; deny by default; sensitive fields encrypted and masked; every sensitive read is audited.

## 2. Data classification
| Class | Examples | Controls |
|---|---|---|
| **C4 Biometric/Highly sensitive** | selfie, liveness video, face embeddings | Separate KMS key, field/object encryption, no staff download, short pre-signed URLs, strictest retention |
| **C3 Sensitive PII** | full name, DOB, ID number, address, ID images | Field-level encryption, masked by default, reveal with justification |
| **C2 Internal** | decision, reason codes, scores | RBAC |
| **C1 Operational** | metrics, queue stats, model runs (no PII) | Broad internal |
| **C0 Public** | docs, notices | none |

## 3. Database users (service identities)
No shared credentials. Dynamic, short-lived credentials from Vault's MongoDB secrets engine.
| Identity | MongoDB role (custom) | Allowed |
|---|---|---|
| `svc-gateway` | `gatewayRW` | insert/update `applicants`, `kyc_cases` (state ≤ DOCS_UPLOADED), `artifacts`, `consents` (insert only), `verification_sessions`; read own-scope fields |
| `svc-orchestrator` | `orchestratorRW` | read/update `kyc_cases` (results, state), `review_tasks` insert, `policies` read, `model_runs` insert |
| `svc-worker-*` | `workerResultW` | write only result subdocuments via orchestrator API/queue (workers prefer **not** to hold DB creds; they return results via queue) |
| `svc-audit` | `auditAppend` | **insert only** on `audit_logs` (no update/delete) |
| `svc-retention` | `retentionDelete` | delete/update on retention-scoped fields, read `retention`; writes `dsar_requests` outcome |
| `svc-analytics` | `analyticsRead` | read pseudonymized views only; write `analytics_daily` |
| `svc-mlops` | `mlRead` | read `model_runs`, labeled outcomes (no PII fields) |
| DBA (human) | `dbAdminNoData` | cluster admin, **no** read on PII collections; break-glass with approval + audit |
Network: DB accepts connections only from app-tier namespaces (NetworkPolicy + auth); never exposed to the internet.

## 4. Collection × role matrix (staff via application layer)
R = read, W = write, M = masked read, – = none, I = insert only
| Collection | Applicant (own) | Reviewer | Sr Reviewer | Compliance | Admin | ML Eng | Auditor |
|---|---|---|---|---|---|---|---|
| `applicants` | R/W own | M | M | R | M | – | M |
| `kyc_cases` | R own status | M (assigned) | M + reveal | M + reveal (justified) | M | – (pseudonymized) | M |
| `artifacts` (images) | upload own | view via signed URL (assigned) | same | view (justified) | – | – | – |
| `consents` | I own, R own | – | – | R | – | – | R |
| `review_tasks` | – | R/W assigned | R/W all | R | R | – | R |
| `audit_logs` | – | – | – | R | R (limited) | – | R |
| `dsar_requests` | I own | – | – | R/W | R | – | R |
| `policies` | – | – | R | R/approve | R/W (propose) | R | R |
| `model_runs`, `drift_reports` | – | – | – | R | R | R/W | R |

## 5. Field-level access (kyc_cases)
| Field | Applicant | Reviewer | Sr Reviewer | Compliance | ML Eng |
|---|---|---|---|---|---|
| `document.ocr.fields.fullName` | own | masked initials (reveal needs sr) | clear on reveal | clear on reveal | – |
| `…idNumber` | own | last4 only | clear on reveal | clear on reveal | – |
| `…dob` | own | age band / masked | clear on reveal | clear on reveal | – |
| `face.distance/match` | – | ✔ | ✔ | ✔ | ✔ (pseudonymized) |
| `liveness.*`, `document.tamper.*` | – | ✔ | ✔ | ✔ | ✔ |
| `decision.*` | status + public reason | ✔ | ✔ | ✔ | ✔ |
| `retention.*` | – | – | – | ✔/W | – |
Implementation: the API layer builds a projection per role; encrypted fields are decrypted only in the service holding a Vault `decrypt` policy, and **reveal** is a separate endpoint requiring role + reason string and writing an audit event. Optionally use MongoDB Queryable/Client-Side Field Level Encryption for C3/C4 fields.

## 6. Encryption & key design
- **Envelope encryption:** per-case or per-field data keys (DEK) wrapped by KEK in Vault/KMS; separate KEKs for C4 vs C3, per region.
- Keys never stored with data; rotation scheduled; revoke key = crypto-erase option for erasure of backups.
- Indexes never built on plaintext sensitive values; use keyed hashes (HMAC) for equality lookup (e.g., `emailHash`).

## 7. Audit requirements for data access
Log: authentication events, every read of C3/C4 data (incl. reveal), exports, permission changes, policy changes, failed access attempts, deletion/erasure actions. Fields: who, what, when, from where (hashed IP), outcome, request ID. Hash-chained and shipped to SIEM; audit DB role is append-only.

## 8. Object storage access
| Principal | Access |
|---|---|
| Gateway | `PutObject` to `cases/*/raw/*` only (write-only) |
| Workers | `GetObject` raw (via task-scoped credentials), `PutObject` evidence |
| Reviewer | pre-signed `GetObject` URL generated by backend after RBAC check, TTL ≤ 5 min, watermark option, no listing |
| Retention service | `DeleteObject` |
| Humans/DevOps | no direct access; break-glass with approval |
Bucket policy: deny non-TLS, deny public, require SSE-KMS, VPC-endpoint-only.

## 9. Row-level rules
- Reviewers see only cases assigned/claimed or in their queue region/jurisdiction.
- Regional partitioning: staff in region A cannot query region B data unless authorized (residency).
- Applicants only access their own `applicantId` (enforced in API, not just UI).

## 10. Testing access control
Automated authorization tests (matrix-driven) in CI; negative tests for IDOR; quarterly access reviews; DB-level role tests with test credentials per role.
