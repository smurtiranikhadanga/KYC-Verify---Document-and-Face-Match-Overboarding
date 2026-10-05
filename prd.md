# Product Requirements Document (PRD)

**Product:** KYC-Flow — self-hosted, AI-assisted KYC verification website & platform
**Method:** Spiral Model | **Status:** Draft v1.0

## 1. Problem statement
Manual / vendor-dependent KYC takes days, costs per-check fees, and sends sensitive biometric data to third parties. The organization wants an **in-house pipeline** that verifies identity in **minutes**, keeps data under its control (data sovereignty), and meets global privacy and AML expectations.

## 2. Vision & goals
| # | Goal | Measure |
|---|---|---|
| G1 | Reduce onboarding time from days to minutes | Median time-to-decision ≤ 5 min (auto path); P95 ≤ 10 min |
| G2 | High straight-through processing (STP) | ≥ target % of cases auto-decided (set after Spiral 3 calibration) |
| G3 | Strong fraud resistance | Face FMR ≤ 1e-5 at operating threshold; liveness attack-detection tracked via APCER/BPCER |
| G4 | Compliance by design | Zero consent-less biometric processing; erasure SLA met; full audit trail |
| G5 | Operational resilience | Queue-driven autoscaling; no data loss on node failure |
| G6 | Sustainable ML | Drift detected and retraining triggered through MLOps loop |

**Non-goals (v1):** ongoing AML transaction monitoring, sanctions/PEP screening engine build (integrate later), native mobile apps (responsive web only), video-call agent verification.

## 3. Personas
| Persona | Needs |
|---|---|
| **Applicant (Asha)** | Fast, clear, mobile-friendly flow; understands what data is collected and why; can withdraw consent |
| **Reviewer (Ravi)** | Sees flagged cases with evidence side-by-side, decides quickly, minimal PII exposure |
| **Senior reviewer** | Handles escalations and overrides, QA samples |
| **Compliance officer (Carla)** | Retention, consent evidence, DSAR/erasure, audit exports, jurisdiction policy |
| **Admin** | User/role management, config, integrations |
| **ML engineer (Mei)** | Model versions, drift, golden-dataset evaluation, retraining |
| **Auditor** | Read-only access to logs and reports |

## 4. Functional requirements
### 4.1 Applicant portal
- FR-A1 Landing page, how-it-works, privacy notice, supported documents.
- FR-A2 Registration / session start (email or phone verification).
- FR-A3 **Granular, written consent** capture (biometric processing separate from general T&Cs); store version, timestamp, IP, text hash.
- FR-A4 Document selection (country, doc type), capture via camera or upload (front/back).
- FR-A5 Live **selfie + liveness** via WebRTC (passive first; active challenge on escalation or by policy).
- FR-A6 Real-time quality feedback (blur, glare, crop, lighting) before submit.
- FR-A7 Status page (processing, approved, rejected, needs resubmission) with reason codes in plain language.
- FR-A8 Consent withdrawal, data-access request, deletion request (≥ 2 request channels per CCPA guidance; no mandatory account just to request).
- FR-A9 Resumable sessions; clear errors for blocked UDP / unsupported browsers (TURN fallback).

### 4.2 Processing pipeline
- FR-P1 Async task creation on upload completion; immediate acknowledgement to user.
- FR-P2 Image pre-processing (deskew, glare suppression, contrast normalization, denoise).
- FR-P3 OCR + structured field extraction (name, DOB, ID number, expiry, address, MRZ where present).
- FR-P4 Document validation: format checks, expiry, checksum/MRZ validation, cross-field consistency.
- FR-P5 Face detection/alignment, ID-photo vs. selfie match (embedding similarity).
- FR-P6 Passive liveness; active liveness when required.
- FR-P7 Tamper detection (ELA, FFT spectral analysis, metadata heuristics).
- FR-P8 Decision engine with configurable rules and thresholds per jurisdiction/risk tier.
- FR-P9 Idempotent, retryable tasks with dead-letter handling.

### 4.3 Reviewer dashboard
- FR-R1 Prioritized queue (SLA timers, risk score, reason flags).
- FR-R2 Case view: document images, extracted fields with confidence, selfie/ID face comparison, liveness and tamper evidence.
- FR-R3 Approve / reject / request resubmission with mandatory reason code; four-eyes for overrides.
- FR-R4 Field-level masking by role; reveal actions are audit-logged.

### 4.4 Compliance & admin console
- FR-C1 Consent ledger search and export.
- FR-C2 Retention policy configuration per data class and jurisdiction.
- FR-C3 DSAR/erasure workflow with verifiable completion certificate.
- FR-C4 RBAC management, access reviews, break-glass workflow.
- FR-C5 Audit log explorer + SIEM forwarding status.

### 4.5 MLOps dashboard
- FR-M1 Model registry view (versions, metrics, stage).
- FR-M2 Drift dashboards (data, prediction, performance) with alert history.
- FR-M3 Trigger/approve retraining and canary promotion.

## 5. Non-functional requirements
| Area | Requirement |
|---|---|
| Performance | Upload ack < 2 s; auto-decision median ≤ 5 min; queue wait alert at configurable depth |
| Scalability | AI workers scale on queue depth (KEDA), scale-to-zero off-peak |
| Availability | RabbitMQ 3 replicas, MongoDB 3-member replica set, PDBs, anti-affinity |
| Security | TLS ≥ 1.2, AES-256 at rest, external KMS, tamper-resistant audit logs |
| Privacy | Data residency by region, retention schedules, right to erasure |
| Accessibility | WCAG 2.2 AA |
| Browser support | Latest Chrome, Safari (iOS/macOS), Firefox, Edge; H.264 fallback |
| Observability | Metrics, logs, traces; SLO dashboards |
| Maintainability | IaC, GitOps, automated tests, model validation gates in CI/CD |

## 6. User stories (sample)
- As an applicant, I can see exactly why my biometric data is needed and agree separately, so I trust the process.
- As an applicant behind a corporate firewall, my video capture still works through TURN over TCP 443.
- As a reviewer, I can compare ID photo and selfie with similarity score and flags, so I decide in under 2 minutes.
- As a compliance officer, I can erase an applicant's data and download proof, so I meet right-to-erasure deadlines.
- As an ML engineer, I am alerted when PSI exceeds threshold and can launch a retraining run gated by golden-dataset metrics.

## 7. KPIs
Time-to-decision (median/P95), STP rate, manual-review rate, false accept / false reject rates, resubmission rate, drop-off per funnel step, queue wait time, OCR CER/WER, FMR/FNMR, liveness APCER/BPCER, drift alerts per month, erasure SLA compliance, cost per verification.

## 8. Assumptions & dependencies
Camera-capable devices; legal sign-off per jurisdiction; GPU optional (CPU inference acceptable for MVP; GPU nodes for scale); labelled golden dataset sourced lawfully.

## 9. Risks (feed into Spiral risk analysis)
| ID | Risk | Mitigation |
|---|---|---|
| R1 | Regulatory non-compliance (BIPA suits, GDPR fines up to €20M/4%) | Strict consent, legal review, retention automation |
| R2 | Spoofing / deepfake attacks | Hybrid liveness, tamper checks, red-team tests |
| R3 | Model drift (silent degradation) | Drift monitoring, golden dataset gates |
| R4 | Queue/DB bottlenecks | Quorum queues, KEDA, indexing, load tests |
| R5 | WebRTC compatibility/firewalls | TURN, H.264 preference, capture fallback to photo upload |
| R6 | Bias / demographic performance gaps | Stratified evaluation, fairness metrics per segment |
| R7 | Model-weight licensing | Early license audit |
| R8 | Operational burden of self-hosting | IaC, runbooks, managed-service options for non-sensitive components |

## 10. Release criteria
All acceptance tests for the spiral pass; security review closed; legal sign-off; load test meets targets; DR drill completed (from Spiral 4).
