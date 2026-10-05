# Data Analysis & Design

What we measure, why, and how analytical data is modeled. The execution side (jobs, streams, drift) is in `Data analysis pipeline.md`.

## 1. Analytical questions
| Domain | Questions |
|---|---|
| Speed | Are we truly "days → minutes"? Where is time spent (user, queue, AI, review)? |
| Accuracy | Are OCR fields correct? Are we falsely accepting/rejecting? |
| Fraud | Which attack types appear? Is liveness holding up? |
| Funnel | Where do applicants drop off and why? |
| Operations | Queue backlog, worker utilization, cost per verification |
| Compliance | Consent coverage, erasure SLA, access to sensitive data |
| ML health | Is data/prediction/performance drifting? Any demographic gaps? |

## 2. Metric catalogue
### Business / product
Time-to-decision (median, P95), STP rate, manual-review rate, approval/rejection rate, resubmission rate, funnel conversion per step, abandonment, cost per verification.
### OCR
Character Error Rate (CER), Word Error Rate (WER), field-level exact-match accuracy (name, DOB, ID number, expiry), low-confidence rate, MRZ checksum pass rate.
### Face verification
False Match Rate (FMR) and False Non-Match Rate (FNMR) at the operating threshold (target e.g. FMR @ 1e-5), score distributions (genuine vs impostor), no-face-detected rate.
### Liveness / tamper
APCER (attack accepted) and BPCER (genuine rejected), tamper flag rate, active-challenge failure rate, replay detection hits.
### Fraud / risk
Confirmed-fraud rate (from reviewer labels), false-positive rate (genuine users flagged), repeat-attempt velocity, device/IP reuse (hashed).
### System
Queue depth/lag, task latency per stage, error/retry/DLQ rates, autoscaling events, DB slow queries, cold-start latency.
### Compliance
% processing with valid biometric consent, withdrawal-to-erasure time, DSAR SLA, PII reveal counts per role, audit coverage.
### Fairness
FNMR/BPCER/OCR accuracy sliced by document type, country, device class, lighting bucket, and (where lawful and consented) demographic groups. Report gap vs best slice.

## 3. Ground truth strategy
| Source | Use | Caveat |
|---|---|---|
| **Golden dataset** (curated, lawful, DVC-versioned) | Release gates; regression | Must be representative; refresh periodically; store securely |
| Reviewer decisions | Ongoing labels for FP/FN | Reviewer error/bias; use QA double-review sample |
| Downstream outcomes (chargebacks, later fraud) | Delayed true labels | Latency; privacy |
| Synthetic/augmented data | Edge cases (glare, blur, rotated) | Not a substitute for real distribution |
Labels are linked via `caseId` pseudonymously; analytics datasets contain **no direct identifiers**.

## 4. Analytical data model (pseudonymized)
### Event stream (`events`)
`{ eventId, ts, caseId(pseudonymized), type, stage, durationMs, outcome, modelVersions, region, docType, deviceClass, appVersion }`
Event types: `session_started, consent_given, doc_captured, selfie_captured, submitted, task_started/finished, decision_made, review_started/finished, resubmitted, erased`.
### Feature snapshot (`model_runs`)
`{ caseId, model, modelVersion, inputStats{blur, glare, brightness, resolution, docType}, outputs{scores}, latencyMs, ts }` — **statistics only**, never raw images.
### Aggregates (`analytics_daily`)
Partition: `date × region × docType × stage`; measures: counts, histograms (latency, scores), rates.
### Star schema (optional warehouse: ClickHouse/Postgres/BigQuery-like self-hosted)
- Fact: `fact_case_stage` (duration, outcome, scores)
- Dims: `dim_time, dim_region, dim_doctype, dim_model_version, dim_device, dim_reason_code`

## 5. Privacy in analytics
Pseudonymize IDs (HMAC with rotating salt); k-anonymity thresholds on dashboards (suppress groups < k); differential access: ML engineers see features, not PII; demographic attributes only if lawful, consented, stored separately and used for fairness testing only.

## 6. Reporting cadence
| Report | Audience | Frequency |
|---|---|---|
| Ops SLO | SRE | real-time |
| Funnel & STP | Product | weekly |
| Accuracy & drift | ML | daily/weekly |
| Fairness | ML + compliance | monthly |
| Compliance pack | Compliance/regulators | monthly/quarterly |

## 7. Acceptance thresholds (initial hypotheses, calibrate in Spiral 3)
| Metric | Starting target |
|---|---|
| Median time-to-decision | ≤ 5 min |
| P95 time-to-decision | ≤ 10 min |
| Face FMR at operating point | ≤ 1e-5 |
| OCR field accuracy (critical fields) | set from baseline; no release if regression > agreed delta |
| Liveness APCER | agree with risk team; track per attack type |
| Drift alert PSI | common heuristic: > 0.1 investigate, > 0.25 act (tune per feature) |
