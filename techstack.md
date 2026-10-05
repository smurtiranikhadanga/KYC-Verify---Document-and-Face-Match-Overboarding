# Tech Stack

Pin exact versions in your lockfiles at project start; the table lists purpose and rationale only.

## 1. Summary
| Layer | Technology | Role |
|---|---|---|
| Frontend | **React** (+ TypeScript, Vite), React Router, TanStack Query, Zod | Onboarding portal, dashboards |
| Real-time capture | **WebRTC** (getUserMedia, MediaRecorder), coturn **TURN** | Selfie/liveness video, firewall traversal |
| API gateway / I/O | **Node.js + Express** (TypeScript), multer/busboy streaming, Zod | Uploads, signaling, consent, auth, BFF |
| AI orchestration | **FastAPI** (Python, Pydantic v2, asyncio) | Workflow state machine, worker control plane |
| Workers | Python workers (pika/aio-pika or Celery-less custom consumers) | OCR, face, liveness, tamper |
| OCR | **PaddleOCR** (PP-OCR, PP-StructureV3) | Multilingual OCR + layout parsing |
| Face | **DeepFace** (ArcFace / FaceNet / VGG-Face backends) | Detection, alignment, embeddings, verify |
| Image processing | **OpenCV**, NumPy, scikit-image | Pre-processing, ELA, FFT analysis |
| Messaging | **RabbitMQ** (quorum queues) + Cluster & Messaging Topology Operators | Async task bus |
| Database | **MongoDB** (3-member replica set, Kubernetes Operator) | Structured metadata/results |
| Object storage | **S3** / MinIO (S3-compatible, SSE-KMS) | Raw images/videos |
| Orchestration | **Docker + Kubernetes**, Helm/Kustomize, Argo CD (GitOps) | Runtime platform |
| Autoscaling | **KEDA** (RabbitMQ scaler), HPA for stateless web | Queue-depth scaling, scale-to-zero |
| Secrets / KMS | **HashiCorp Vault** (or AWS KMS / Azure Key Vault) | Keys, envelope encryption, dynamic creds |
| Identity | OIDC/SAML IdP (Keycloak recommended for self-host) | SSO, MFA, staff auth |
| Observability | **Prometheus, Grafana**, Loki, OpenTelemetry, Alertmanager | Metrics, logs, traces |
| SIEM | Wazuh / Elastic / customer SIEM | Tamper-resistant audit analysis |
| MLOps | **MLflow**, **DVC**, **Feast** (optional), **Evidently AI**, **Great Expectations**, **Apache Airflow** | Registry, data versioning, drift, validation, retraining |
| CI/CD | GitLab CI or GitHub Actions/CircleCI | Build, test, scan, model gates, deploy |
| Security tooling | Trivy, Semgrep, Dependabot/Renovate, OWASP ZAP, Gitleaks | Supply-chain & app security |

## 2. Rationale
- **React + WebRTC:** needed for live capture. Handle browser codec differences (Safari/iOS prefers H.264; Chrome VP8/VP9) and firewall blocking of UDP via TURN over TCP 443.
- **Node.js + FastAPI hybrid:** Node's non-blocking I/O suits uploads and signaling; Python hosts the ML ecosystem. Separating them lets I/O and compute scale independently.
- **PaddleOCR over Tesseract:** stronger multilingual and low-quality-input performance, structured output via PP-StructureV3.
- **DeepFace:** a unified wrapper over several face models, so models can be swapped/A-B tested.
- **RabbitMQ quorum queues:** Raft-replicated durability; classic mirrored queues are the legacy approach.
- **MongoDB + S3:** embed per-case data for single-read retrieval; large binaries stay in object storage.
- **KEDA:** standard HPA cannot natively scale on queue depth; KEDA can, including scale-to-zero.

## 3. Alternatives considered
| Need | Chosen | Alternatives | Why not (now) |
|---|---|---|---|
| OCR | PaddleOCR | Tesseract, docTR | Lower multilingual/low-quality accuracy (Tesseract); docTR kept as benchmark candidate |
| Face | DeepFace | InsightFace direct, AWS Rekognition | Rekognition is vendor-hosted; InsightFace is a candidate for production-tuned swap |
| Queue | RabbitMQ | Kafka, SQS | Task-queue semantics + simpler ops; Kafka better for event streams (analytics) later |
| DB | MongoDB | PostgreSQL | Document shape fits KYC cases; Postgres viable if relational reporting dominates |
| Identity | Keycloak | Auth0, Okta | Self-hosted requirement |

## 4. Known caveats from the research
1. **Lazy queues vs quorum queues:** the report recommends both. In current RabbitMQ, `x-queue-mode=lazy` applies to *classic* queues; quorum queues already persist to disk and manage memory differently. Use quorum queues for durability and validate memory behaviour under load; do not rely on the lazy argument for quorum queues.
2. **Liveness in DeepFace:** verify what anti-spoofing the chosen DeepFace version offers; plan a dedicated passive-liveness model (and benchmark with APCER/BPCER) rather than assuming DeepFace alone suffices.
3. **GPU vs CPU:** PaddleOCR and face models run on CPU for MVP; add GPU node pool when latency or volume demands. Model loading is slow, so keep workers warm (`minReplicaCount ≥ 1`) if scale-to-zero cold start breaks the latency SLO.
4. **Weight licensing:** audit licenses for each face/liveness weight file before commercial deployment.

## 5. Environment matrix
| Env | Infra | Data |
|---|---|---|
| Local | Docker Compose, MinIO, single Mongo/Rabbit | Synthetic only |
| Dev/CI | Ephemeral K8s (kind/k3d) | Synthetic + golden subset (non-PII) |
| Staging | K8s mirror of prod, small | Masked/synthetic |
| Prod | Region-pinned K8s, dedicated node pools (app, db, ai-workers, optional GPU) | Real, encrypted |
