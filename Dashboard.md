# Dashboards

Three role-gated dashboards inside one React console (`apps/dashboard`), SSO via OIDC with MFA. Data via staff API; heavy aggregates from precomputed analytics collections / Prometheus.

## 1. Reviewer Dashboard
### Queue view
| Column | Notes |
|---|---|
| Case ID (short) | no PII in list |
| Age / SLA timer | color escalation |
| Risk score & flags | e.g. LOW_FACE_MATCH, TAMPER_SUSPECT, OCR_LOW_CONF, LIVENESS_BORDERLINE |
| Jurisdiction / doc type | filters |
| Assigned to | claim lock with TTL |
Filters: flag, jurisdiction, SLA, doc type, reviewer. Bulk actions limited (no bulk approve).

### Case detail
- **Left:** document images (zoom, rotate, contrast tools), tamper heatmap overlay (ELA/FFT), OCR bounding boxes.
- **Center:** extracted fields table with per-field confidence, validation results (expiry, MRZ checksum, cross-field).
- **Right:** ID photo vs selfie side-by-side, similarity vs threshold, liveness scores, system reason codes.
- **Actions:** Approve / Reject / Request resubmission (reason code required, free-text optional), Escalate.
- **PII masking:** ID number, address, DOB masked; "Reveal" requires role + justification, logged.
- **Four-eyes:** overriding an auto-reject/high-risk flag requires senior reviewer approval.
- **Shortcuts:** `A` approve, `R` reject, `S` resubmit, `E` escalate, `N` next.
- **Feedback labels:** each decision stored as ground truth for model evaluation.

### Reviewer performance (supervisor view)
Throughput, average handle time, override rate, QA sample agreement.

## 2. Compliance & Admin Console
| Module | Features |
|---|---|
| Consent ledger | Search by case/user; view consent text version, timestamp, IP hash; withdrawal status; export |
| Retention | Policy per data class & jurisdiction; upcoming purges; legal hold flag |
| DSAR / Erasure | Request inbox, SLA countdown, execution wizard, completion certificate |
| Audit explorer | Filter by actor/action/resource/time; integrity-chain verification status; SIEM forwarding health |
| Access governance | Users, roles, access reviews, break-glass requests/approvals |
| Policy config | Decision thresholds (versioned, change requires approval), active-liveness policy, reason-code catalogue |
| Reports | Monthly regulator-ready report: volumes, outcomes, SLA, erasure stats |

## 3. MLOps Dashboard
| Panel | Content |
|---|---|
| Model registry | Active/staging versions per component (OCR, face, liveness, tamper), MLflow links, lineage (data version, code commit) |
| Accuracy | CER/WER trend (OCR), FMR/FNMR at operating threshold (face), APCER/BPCER (liveness), from labeled reviewer feedback + golden dataset |
| Drift | Data drift (PSI/KS on image-quality stats, doc-type mix, score distributions), prediction drift, performance drift; alert states |
| Fairness | Metrics sliced by region/doc type/skin-tone proxies where lawful & consented |
| Retraining | DAG runs, gate results, canary status, promote/rollback buttons (approval-gated) |
| Cost/latency | Inference latency P50/P95 per stage, GPU/CPU utilisation |

## 4. Operations (Grafana) dashboards
- **Pipeline health:** queue depth per queue, consumer count, message rates, DLQ size, KEDA replica counts.
- **Latency/SLO:** time-to-decision histogram, burn rate.
- **Data tier:** Mongo ops/latency/replication lag, slow queries (COLLSCAN count), RabbitMQ disk I/O and memory alarms.
- **Security:** failed logins, reveal-PII events, permission changes, anomalous exports.

## 5. Business KPI dashboard (exec)
Funnel (start → consent → doc → selfie → submit → approved), drop-off by step, STP %, manual-review %, median time-to-decision, rejection reasons, cost per verification.

## 6. Dashboard access matrix (summary)
| Dashboard | Applicant | Reviewer | Sr Reviewer | Compliance | Admin | ML Eng | Auditor |
|---|---|---|---|---|---|---|---|
| Review queue/case | – | ✔ | ✔ | view (masked) | – | – | view (masked) |
| Compliance console | – | – | – | ✔ | ✔ (limited) | – | ✔ read-only |
| Admin/policy | – | – | – | approve | ✔ | – | read-only |
| MLOps | – | – | – | read | – | ✔ | read-only |
| Ops dashboards | – | – | – | – | ✔ | ✔ | read-only |
Full RBAC in `Access control systems.md`.
