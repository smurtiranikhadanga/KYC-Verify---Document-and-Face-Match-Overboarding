# Skills for the Project

Team composition, skills matrix, and learning path, mapped to spirals.

## 1. Team roles
| Role | Count (MVP) | Responsibilities |
|---|---|---|
| Product Owner / PM | 1 | PRD, backlog, spiral reviews, stakeholder go/no-go |
| Spiral/Risk Manager (can be PM/Tech Lead) | 1 | Risk register, quadrant ceremonies |
| Tech Lead / Architect | 1 | Architecture, ADRs, standards |
| Frontend engineers (React/WebRTC) | 2 | Portal, capture UX, dashboards |
| Backend engineers (Node/Express) | 2 | Gateway, APIs, audit, notifications |
| Python/ML engineers (FastAPI, CV) | 2-3 | Orchestrator, workers, models |
| ML/MLOps engineer | 1 | Eval harness, MLflow, drift, retraining |
| DevOps/SRE (K8s) | 1-2 | Cluster, GitOps, KEDA, RabbitMQ/Mongo operators, observability |
| Security engineer | 1 | Threat models, Vault/KMS, pen-test coordination |
| Compliance/Privacy Officer + Legal counsel | 1 + advisory | GDPR/CCPA/BIPA, DPIA, retention, consent text |
| UX/UI designer + researcher | 1 | Flows, accessibility, usability tests |
| QA / SDET | 1-2 | Automation, spoof test suite, load tests |
| Data analyst | 0.5-1 | KPIs, fairness, funnel |
| Reviewer ops lead (pilot) | 1 | Review SOPs, labeling quality |

## 2. Skills matrix (importance: ●●● critical, ●● important, ● helpful)
### Frontend
| Skill | Level | Notes |
|---|---|---|
| React + TypeScript, state mgmt | ●●● | |
| WebRTC (getUserMedia, ICE/STUN/TURN, codecs H.264/VP8/VP9) | ●●● | Safari/iOS quirks; TURN on TCP 443 |
| Camera UX, image quality hints | ●● | |
| Accessibility (WCAG 2.2) | ●●● | |
| Testing (Playwright, RTL) | ●● | |
### Backend / API
| Skill | Level |
|---|---|
| Node.js, Express, streaming uploads (multipart) | ●●● |
| FastAPI, asyncio, Pydantic | ●●● |
| REST/OpenAPI design, idempotency | ●●● |
| RabbitMQ (exchanges, quorum queues, acks, prefetch, DLQ) | ●●● |
| OIDC/OAuth2/SAML, JWT | ●●● |
| MongoDB (schema design, ESR indexing, explain, TTL, replica sets, sharding) | ●●● |
| S3 APIs, pre-signed URLs, SSE-KMS | ●●● |
### AI / ML
| Skill | Level |
|---|---|
| Python, NumPy, OpenCV | ●●● |
| OCR (PaddleOCR, layout parsing, MRZ) | ●●● |
| Face recognition (embeddings, thresholds, FMR/FNMR, ROC/DET) | ●●● |
| Presentation attack detection (liveness, APCER/BPCER) | ●●● |
| Image forensics (ELA, FFT) | ●● |
| Model evaluation, fairness metrics | ●●● |
| Model optimization (ONNX, quantization, GPU) | ●● |
### MLOps
| Skill | Level |
|---|---|
| MLflow, DVC, Great Expectations, Evidently AI | ●●● |
| Airflow DAGs | ●● |
| Drift statistics (PSI, KS) | ●●● |
| Canary/staged rollouts | ●● |
| Feature stores (Feast) | ● |
### Platform / DevOps
| Skill | Level |
|---|---|
| Docker, Kubernetes (requests/limits, QoS, probes, PDB, anti-affinity, NetworkPolicy) | ●●● |
| KEDA scaling | ●●● |
| Helm/Kustomize, Argo CD (GitOps) | ●●● |
| RabbitMQ & MongoDB Kubernetes Operators | ●●● |
| Prometheus, Grafana, Loki, OpenTelemetry | ●●● |
| Storage performance (IOPS) | ●● |
| CI/CD (GitLab CI/GitHub Actions/CircleCI) | ●●● |
| Terraform/IaC | ●● |
### Security & compliance
| Skill | Level |
|---|---|
| Vault/KMS, envelope encryption, TLS/mTLS | ●●● |
| Threat modeling (STRIDE), secure SDLC | ●●● |
| GDPR, CCPA/CPRA, BIPA, AML/FATF basics | ●●● |
| SIEM and audit logging | ●● |
| Pen-testing/red-teaming of biometric systems | ●● |
| DPIA authoring | ●● |
### Product & process
| Skill | Level |
|---|---|
| **Spiral model facilitation, risk analysis/prototyping** | ●●● |
| Technical writing, ADRs | ●● |
| UX research, usability testing | ●● |
| Data analysis, SQL/Mongo aggregation | ●● |

## 3. Skills by spiral
| Spiral | Most needed skills |
|---|---|
| 0 | Legal/compliance, architecture, risk analysis, UX prototyping |
| 1 | React/WebRTC, Node, FastAPI, PaddleOCR, DeepFace, OpenCV, Docker/K8s basics |
| 2 | Security engineering, Vault/OIDC, RBAC, consent/privacy engineering, DPIA |
| 3 | KEDA, RabbitMQ tuning, Mongo indexing, observability, load testing |
| 4 | PAD/liveness, image forensics, NetworkPolicy/PodSecurity, DR engineering, pen-testing |
| 5 | MLOps (Evidently, MLflow, Airflow), fairness, canary releases |

## 4. Learning path (for a generalist developer)
1. **Weeks 1-2:** Docker, Kubernetes fundamentals; REST + OpenAPI; MongoDB basics.
2. **Weeks 3-4:** React + WebRTC; Node/Express uploads; FastAPI async.
3. **Weeks 5-6:** RabbitMQ patterns (work queues, acks, prefetch, DLQ); S3 SDKs.
4. **Weeks 7-8:** OpenCV, PaddleOCR, DeepFace; evaluation metrics (CER/WER, FMR/FNMR).
5. **Weeks 9-10:** Security/privacy: TLS, Vault, OIDC, GDPR/BIPA primers.
6. **Weeks 11-12:** KEDA, Prometheus/Grafana, MongoDB indexing with `explain()`.
7. **Ongoing:** MLOps (MLflow, DVC, Evidently), fairness, red-teaming.
Suggested resources: official docs of each tool (RabbitMQ consumer prefetch & quorum queues, MongoDB indexing/ESR, KEDA scalers, PaddleOCR, DeepFace), NIST FRVT/FATE reports on face recognition and PAD, ISO/IEC 30107 (PAD), ICAO 9303 (MRZ), OWASP ASVS, GDPR/BIPA/CCPA primary texts.

## 5. Team rituals for the spiral model
- **Spiral kickoff (Quadrant 1):** charter, objectives, constraints.
- **Risk workshop (Quadrant 2):** rank risks, choose spikes/prototypes.
- **Sprint-style development (Quadrant 3):** 1-2 week sprints inside the spiral.
- **Spiral review (Quadrant 4):** demo, metrics, go/no-go, retrospective, next charter.
- **Standing:** weekly risk-register review; monthly compliance check-in; quarterly access review and DR drill.

## 6. Capability gaps & mitigation
| Likely gap | Mitigation |
|---|---|
| Biometric PAD expertise is scarce | Early consultant/advisor; adopt benchmarked models; red-team in Spiral 4 |
| K8s + stateful operators complexity | Dedicated SRE; managed K8s control plane; rehearse failovers |
| Legal expertise across regions | Retain privacy counsel per region; strictest-standard baseline |
| MLOps maturity | Start simple (MLflow + scheduled evals), automate progressively |
