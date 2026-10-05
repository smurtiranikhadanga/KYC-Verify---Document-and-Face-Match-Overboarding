# Security

Security and privacy are architectural constraints for a self-hosted KYC system: the organization carries the full compliance burden. Identity/RBAC details: `Access control systems.md`. Data-level rules: `Database structure and access control.md`.

## 1. Regulatory baseline
| Regime | Key implications for biometrics/KYC |
|---|---|
| **GDPR** | Biometric data used for unique identification is a *special category*; explicit consent generally required; fines up to €20M or 4% of global turnover; right to erasure; data residency/transfer rules |
| **CCPA/CPRA** | Biometric info is personal information; right to limit use of sensitive data; ≥ 2 request methods; no account required to submit a request |
| **BIPA (Illinois)** | Informed **written** consent before collection; **public retention schedule**; private right of action (high litigation risk) |
| **AML/KYC (FATF-aligned local law)** | Record-keeping and verification obligations that may *conflict* with erasure: define lawful retention per jurisdiction |
**Policy decision:** adopt the strictest common denominator (BIPA-style written, specific consent + published retention schedule) for all regions. Obtain legal review per jurisdiction; this document is not legal advice.

## 2. Threat model (STRIDE-oriented summary)
| Threat | Example | Controls |
|---|---|---|
| Spoofing (applicant) | Printed photo, replay video, mask, deepfake, injection of virtual camera | Hybrid passive+active liveness, nonce-bound challenges, replay detection, virtual-camera heuristics, device signals |
| Spoofing (staff/service) | Stolen credentials | SSO + MFA, short-lived tokens, mTLS for services |
| Tampering (documents) | Edited ID images | ELA, FFT, metadata checks, template validation, MRZ checksums |
| Tampering (data/logs) | Altering decisions or audit trail | Append-only audit role, hash chain, SIEM, object versioning |
| Repudiation | "I never consented" | Immutable consent ledger (text hash, version, timestamp) |
| Information disclosure | DB/S3 leak, insider browsing PII | Encryption, KMS separation, masking, reveal audit, network isolation |
| DoS | Upload floods, queue flooding | Rate limits, WAF, size limits, backpressure, KEDA caps (`maxReplicaCount`) |
| Elevation of privilege | IDOR, role abuse | Server-side authz tests, least privilege, four-eyes |
| Supply chain | Malicious dependency/model weights | SBOM, image signing, pinned hashes, scanning, model-artifact checksums |
| ML-specific | Adversarial inputs, model theft, poisoning of retraining data | Input validation, rate limiting, signed registry, curated labels, retraining approval gate |

## 3. Cryptography
- **In transit:** TLS ≥ 1.2 (prefer 1.3) everywhere, including east-west (service mesh/mTLS). HSTS, modern cipher suites.
- **At rest:** AES-256 for DB volumes, S3 (SSE-KMS), backups, audit logs.
- **Key management:** external KMS/Vault (HashiCorp Vault, AWS KMS, Azure Key Vault). Keys never co-located with data. Envelope encryption with per-region KEKs; separate keys for biometric (C4) vs PII (C3). Rotation schedule; crypto-erase capability.
- **Hashing:** HMAC (keyed) for lookup hashes; Argon2id for any passwords (staff handled by IdP).
- **Secrets:** Vault injection (CSI/agent); no secrets in Git/images; Gitleaks in CI.

## 4. Network & platform security
- Multi-tier segmentation: edge → app → data. **DB and broker reachable only from app tier**; default-deny NetworkPolicies.
- WAF + rate limiting at ingress; TURN restricted and credentialed (time-limited REST credentials).
- Kubernetes: Pod Security "restricted", non-root, read-only FS, dropped capabilities, resource requests/limits, admission policies (Kyverno/OPA) blocking unsigned/latest images, private registry, node hardening, etcd encryption, audit logging on API server.
- Separate node pools for data and AI workloads; no host mounts.
- Egress control: workers cannot reach the internet (model weights baked into images / pulled from internal registry).

## 5. Application security
- Input validation (Zod/Pydantic), strict MIME sniffing, magic-byte checks, max sizes, image decompression-bomb limits, strip EXIF on stored derivatives (keep original for forensic only under C3/C4 rules).
- Malware scanning (ClamAV) on uploads before processing.
- Safe image/video decoding in sandboxed worker containers (resource-limited, seccomp).
- CSRF protection, SameSite cookies, CSP, secure headers, CORS allow-list.
- Webhook signing, idempotency keys, replay protection.
- Pre-signed URLs: short TTL, single-purpose, bound to caller.
- Anti-automation: bot detection and attempt velocity limits per device/IP/session (hashed).
- Liveness anti-replay: server nonce + expiry + challenge sequence randomization.

## 6. Privacy engineering
| Requirement | Implementation |
|---|---|
| Consent | Granular ledger; separate biometric consent; withdrawal flow; CI job verifying consent logs update on withdrawal |
| Purpose limitation | Biometrics used only for verification; no secondary use (training) without explicit lawful basis |
| Minimization | Delete raw biometrics after decision + dispute window; store embeddings only if necessary |
| Retention | Configurable schedule per data class/jurisdiction; published schedule; automated enforcement (TTL, retention-service) |
| Erasure | Automated workflow across S3, Mongo, caches, derived data; backups expire per documented cycle; certificate of erasure |
| Residency | Region-pinned stacks; no cross-border replication without safeguards |
| DPIA | Mandatory before pilot (Spiral 2) and on material change |
| Transparency | Plain-language privacy and biometric notices; retention schedule public |

## 7. Audit logging & monitoring
- Log: authentication, authorization failures, all C3/C4 reads and reveals, exports, config/policy changes, role changes, deletions, admin actions.
- Properties: append-only, hash-chained, encrypted in transit and at rest, time-synchronized, shipped to SIEM; retention per policy.
- Detections (SIEM): mass reveals, off-hours access, access from new geography, repeated authz failures, unusual export volume, DLQ spikes tied to malformed uploads.

## 8. Secure SDLC (aligned with spiral risk analysis)
| Phase | Activity |
|---|---|
| Plan | Threat model per spiral; abuse cases; privacy review |
| Code | Linters, SAST (Semgrep), secret scanning, peer review |
| Build | SBOM, dependency scan (automated vulnerability scanning in CI), container scan (Trivy), image signing |
| Test | DAST (ZAP), authz matrix tests, fuzzing on upload endpoints, **spoof-attack test suite** (print, replay, screen, mask, deepfake samples) |
| Release | Policy-as-code gates, staged rollout |
| Operate | Patch SLAs, vuln management, log review, key rotation |
| Respond | IR plan, breach notification workflow (GDPR 72h clock), forensics runbooks, post-mortem → risk register |
External penetration test before production and annually; red-team of liveness in Spiral 4.

## 9. Incident response (summary)
Detect → triage → contain (revoke keys/tokens, isolate namespace) → eradicate → recover → notify regulators/individuals per law → post-mortem. Tabletop exercises twice a year.

## 10. Business continuity
Backups (Mongo snapshots + oplog, S3 versioning), restore drills, multi-AZ within region, RabbitMQ topology in Git, documented RPO/RTO, DR run-books (Spiral 4 exit criterion).

## 11. Security acceptance checklist (go-live)
- [ ] TLS 1.2+ everywhere; mTLS internal
- [ ] AES-256 at rest; keys in external KMS; rotation tested
- [ ] NetworkPolicies default-deny verified
- [ ] RBAC + field-level masking tests pass; no IDOR
- [ ] Audit trail integrity verification works; SIEM alerts firing in test
- [ ] Consent ledger + withdrawal + erasure end-to-end tested
- [ ] Spoof-attack suite results accepted by risk owner
- [ ] Pen-test findings (critical/high) closed
- [ ] DR drill completed; DPIA & legal sign-off recorded
