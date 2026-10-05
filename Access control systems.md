# Access Control Systems

Authentication, authorization, and governance for **applicants, staff, and services**. Data-level mappings: `Database structure and access control.md`.

## 1. Identity domains
| Domain | Who | AuthN | Notes |
|---|---|---|---|
| Applicant | End customers | Email/phone OTP → short-lived session token | No password required; session bound to case; optional passkey for returning users |
| Staff | Reviewers, compliance, admin, ML, auditors | **OIDC/SAML SSO** via Keycloak/enterprise IdP, **MFA required** | Session timeouts, device posture optional |
| Service | gateway, orchestrator, workers, retention, etc. | **mTLS** + Kubernetes ServiceAccount identity (SPIFFE/Istio or Vault K8s auth) | Short-lived credentials, no static secrets |
| Break-glass | Emergency admin | Time-boxed elevated role with approval | Full session recording/audit |

## 2. Tokens & sessions
- Staff: OIDC authorization code + PKCE; access token (≤ 15 min), refresh token rotation; tokens carry `sub`, `roles`, `region`, `jurisdictions`.
- Applicant: opaque/JWT token scoped to `{applicantId, caseId}`; HttpOnly, SameSite cookies; short TTL; revoked on withdrawal/completion.
- Service-to-service: mTLS + audience-restricted JWT.
- Logout and revocation lists; idle timeout (staff 15-30 min) and absolute timeout.

## 3. Authorization model: RBAC + ABAC + field-level
**Layer 1: RBAC (coarse):** role → permissions.
**Layer 2: ABAC (context):** region/jurisdiction match, assignment (reviewer owns claim), risk tier, time, justification present.
**Layer 3: Field-level:** projection and masking per role (see DB access doc).
Policy engine: OPA (Rego) or Cerbos, evaluated in gateway/orchestrator; policies in Git with tests; decisions logged.

## 4. Roles & permissions
| Role | Key permissions |
|---|---|
| `applicant` | create/read own case, upload, consent, DSAR |
| `reviewer` | read assigned masked cases, view evidence via signed URL, decide (non-override) |
| `senior_reviewer` | all reviewer + reveal masked fields (with reason), approve overrides, QA |
| `compliance_officer` | consent ledger, DSAR/erasure execution, retention policy, audit read, approve policy changes |
| `admin` | user/role admin (cannot read PII), configuration proposals, ops dashboards |
| `ml_engineer` | model registry, drift, retraining; pseudonymized data only |
| `auditor` | read-only logs/reports (masked) |
| `sre` | infra access, no PII data access |
| `svc:*` | see service matrix |

### Permission matrix (actions)
| Action | Reviewer | Sr Rev | Compliance | Admin | ML | Auditor |
|---|---|---|---|---|---|---|
| View case (masked) | ✔ assigned | ✔ | ✔ | ✔ | – | ✔ |
| Reveal PII | – | ✔* | ✔* | – | – | – |
| Approve/reject | ✔ | ✔ | – | – | – | – |
| Override auto-decision | – | ✔ (+second approver) | – | – | – | – |
| Export data | – | – | ✔* | – | – | – |
| Execute erasure | – | – | ✔ (two-person) | – | – | – |
| Change thresholds | – | – | approve | propose | propose | – |
| Manage users/roles | – | – | – | ✔ (two-person for privileged roles) | – | – |
| Promote model | – | – | approve (face/liveness) | – | ✔ | – |
| Read audit logs | – | – | ✔ | limited | – | ✔ |
*requires justification string; audited; rate-limited.

## 4.1 Service permission matrix
| Service | Mongo | S3 | Vault | RabbitMQ |
|---|---|---|---|---|
| gateway | RW limited | put raw | encrypt, sign URL | publish `kyc.cases` |
| orchestrator | RW results/state | read evidence | decrypt scoped | consume cases, publish tasks, consume results |
| workers | none (result via queue) | read raw (task-scoped), put evidence | decrypt scoped | consume own task queue, publish results |
| audit | insert-only audit | – | sign | consume audit exchange |
| retention | delete/update retention fields | delete | decrypt/rotate admin | – |
| analytics | read pseudonymized | – | – | consume analytics exchange |
RabbitMQ: per-service users/vhosts with configure/write/read regex limits; TLS; topology operator enforces definitions.

## 5. Separation of duties & approval flows
- **Four-eyes:** overriding auto-rejects, changing thresholds, executing erasure, granting privileged roles.
- Admins manage access but cannot read applicant PII; compliance can read PII only with justification.
- Developers have no production data access; production access is just-in-time, ticket-linked, time-boxed.

## 6. Access lifecycle
Joiner (role request → manager approval → provisioning via IdP groups) → Mover (re-certify) → Leaver (automatic deprovision via SCIM within 24 h). **Quarterly access reviews** by compliance; stale-access detection.

## 7. Application enforcement points
1. Ingress/WAF: rate limits, IP reputation.
2. Gateway: authN, token validation, policy check, input validation.
3. Orchestrator: internal-only mTLS; verifies caller service identity.
4. Data layer: DB roles, S3 policies, Vault policies (defense in depth).
5. UI: hides unavailable actions (convenience only, never the control).

## 8. Abuse & anomaly controls
Account lockout/backoff for OTP; per-session attempt caps; bulk reveal alerts; geo/time anomaly detection; auto-suspend sessions on SIEM high-severity alert.

## 9. Testing & verification
Matrix-driven authorization tests per endpoint × role (CI); IDOR/BOLA tests; policy unit tests (OPA `opa test`); Vault policy tests; periodic privilege-escalation pen tests; audit-log assertions (every reveal produces an event).

## 10. Implementation sketch (policy example)
```rego
package kyc.authz
default allow = false
allow {
  input.action == "case.reveal"
  input.user.roles[_] == "senior_reviewer"
  input.user.region == input.resource.region
  count(input.context.justification) >= 15
}
```
