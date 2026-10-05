# KYC-Flow — AI-Assisted KYC Verification Platform

> Production-ready, compliant, self-hosted KYC verification MVP built with the MERN stack (MongoDB, Express, React, Node.js + TypeScript).

KYC-Flow streamlines identity verification from **days to minutes**. It pairs biometric consent and live capture for applicants with an intelligent decision engine, role-gated reviewer portals, senior reviewer PII reveal controls, compliance ledgers, DSAR erasure workflows, and MLOps telemetry.

---

## 1. Project Overview

KYC-Flow implements the complete end-to-end identity verification workflow designed in the project specifications:
- **Applicant Experience:** Instant contact verification with development OTP, explicit biometric consent (separate from Terms), multi-country document capture with live glare/blur quality pre-checks, live webcam selfie capture with oval face guide and passive/active liveness, 202-Accepted submission, and a live progress stepper.
- **Reviewer Console:** Real-time priority queue with SLA countdowns, 3-column evidence inspection (document viewer + ELA tamper heatmap, extracted OCR fields with confidence, biometric face comparison vs thresholds), and audit-logged decision actions (Approve, Reject, Resubmit, Escalate).
- **Senior Reviewer Controls:** Four-Eyes override on automated or high-risk rejections, plus role-gated PII unmasking with mandatory, audit-logged business justifications.
- **Compliance Portal:** Immutable consent ledger, DSAR erasure & access workflow that physically deletes disk artifacts, retention schedules, and SHA-256 tamper-evident audit log trail.
- **Admin Console:** User management, role elevation, system telemetry, and dynamic policy threshold updates.
- **MLOps Dashboard:** Model registry (PaddleOCR, DeepFace, AntiSpoof-CNN, OpenCV ELA), accuracy/latency metrics, PSI/KS data drift monitors, and retraining controls.

---

## 2. Architecture & Design Principles

```
                              ┌────────────────────────────────────────┐
                              │            Applicant Portal            │
                              │ (React + Vite + Tailwind + WebRTC)     │
                              └───────────────────┬────────────────────┘
                                                  │
                                       REST / Multi-part Uploads
                                                  │
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │          Express Gateway API           │
                              │  (TypeScript, Helmet, CORS, RateLimit) │
                              └─────────┬───────────────────┬──────────┘
                                        │                   │
                     ┌──────────────────┴──┐             ┌──┴──────────────────┐
                     │   StorageProvider   │             │      JobQueue       │
                     │  - LocalStorage     │             │  - LocalJobQueue    │
                     │  - S3Storage (Ready)│             │  - RabbitMQ (Ready) │
                     └─────────────────────┘             └─────────┬───────────┘
                                                                   │
                                                                   ▼
                                                         ┌─────────────────────┐
                                                         │     AIService       │
                                                         │  - MockAIService    │
                                                         │  - PythonAIService  │
                                                         └─────────┬───────────┘
                                                                   │
                                                                   ▼
                                                         ┌─────────────────────┐
                                                         │   Decision Engine   │
                                                         │  - Rule Evaluator   │
                                                         │  - Threshold Matrix │
                                                         └─────────┬───────────┘
                                                                   │
                                                                   ▼
                                                         ┌─────────────────────┐
                                                         │   MongoDB Database  │
                                                         │  (Mongoose Schemas) │
                                                         └─────────────────────┘
```

### Clean Abstractions for Production Scaling
1. **`StorageProvider` Abstraction:** Local disk storage saves files to `server/uploads/` while exposing an interface identical to the AWS S3 / MinIO provider.
2. **`AIService` Abstraction:** The current MVP runs deterministic, realistic mock AI services (`ocr.service.ts`, `face.service.ts`, `liveness.service.ts`, `tamper.service.ts`, `document-validation.service.ts`). The `FuturePythonAIService` adapter enables zero-code-change migration to Python FastAPI microservices (PaddleOCR, DeepFace, OpenCV ELA/FFT).
3. **`JobQueue` Abstraction:** Uses an asynchronous in-process queue for instant 202 Accepted case submissions, fully structured for drop-in RabbitMQ quorum queues.
4. **Resilient MongoDB Layer:** Connects to standard MongoDB (`mongodb://127.0.0.1:27017/kyc-flow`) or automatically falls back to an embedded in-memory MongoDB instance (`mongodb-memory-server`) if no external database service is running locally.

---

## 3. Tech Stack

- **Frontend:**
  - React 18 & TypeScript
  - Vite 6
  - Tailwind CSS 3
  - Lucide React (Icons)
  - React Router DOM 7
  - Axios
  - Recharts (Data visualization & drift monitoring)
- **Backend:**
  - Node.js & Express (TypeScript)
  - Mongoose & MongoDB
  - JWT (JSON Web Tokens) & bcryptjs
  - Multer (Multipart file uploads)
  - Zod (Schema validation)
  - Helmet & CORS & Express Rate Limit
  - Vitest & Supertest (Automated testing)

---

## 4. Folder Structure

```text
kyc-flow/
├── client/
│   ├── src/
│   │   ├── components/         # Shared UI components (navbar, modals, badges, cards)
│   │   ├── context/            # AuthContext, VerificationContext
│   │   ├── layouts/            # PublicLayout, ApplicantLayout, StaffLayout
│   │   ├── pages/
│   │   │   ├── public/         # Landing, HowItWorks, SupportedDocs, Privacy, FAQ, Contact
│   │   │   ├── applicant/      # VerifyStart, Contact, Consent, Document, Selfie, Review, Status, PrivacyCenter
│   │   │   └── staff/          # Login, Dashboard, ReviewQueue, CaseDetail, Compliance, Admin, MLOps, Audit
│   │   ├── routes/             # AppRoutes with role-based Route Guards
│   │   ├── services/           # Axios API services (auth, case, review, compliance, admin, mlops)
│   │   ├── types/              # Frontend TypeScript definitions
│   │   ├── utils/              # Client helpers
│   │   ├── App.tsx             # Root React component
│   │   └── main.tsx            # React entrypoint
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── ai/                 # AI service abstraction, OCR, Face, Liveness, Tamper, Decision Engine
│   │   ├── config/             # Environment variables & MongoDB connection with auto-fallback
│   │   ├── controllers/        # Express route handlers
│   │   ├── jobs/               # Background JobQueue, CaseProcessor, and Seed script
│   │   ├── middleware/         # Auth, RBAC, error handling, file upload
│   │   ├── models/             # Mongoose schemas (Case, User, Applicant, Artifact, Consent, etc.)
│   │   ├── routes/             # Express API routes
│   │   ├── storage/            # StorageProvider, LocalStorage, S3Storage
│   │   ├── tests/              # Vitest test suite (Auth, OTP, Decision rules, PII reveal RBAC)
│   │   ├── types/              # Backend TypeScript types
│   │   ├── utils/              # Masking utilities, token signers, hashers
│   │   ├── validators/         # Zod request validators
│   │   └── server.ts           # Server initialization
│   ├── uploads/                # Local uploaded artifacts
│   ├── package.json
│   └── tsconfig.json
├── shared/
│   └── types/                  # Shared domain types
├── docker-compose.yml          # Containerized MongoDB
├── .env.example                # Sample environment variables
├── package.json                # Monorepo workspaces & root scripts
└── README.md
```

---

## 5. Getting Started & Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Optional: MongoDB local service or Docker (not required; in-memory fallback boots automatically)

### 1. Clone & Install Dependencies
From the repository root:
```bash
npm install
```
This automatically installs root tools and bootstraps dependencies across both the `client` and `server` workspaces.

### 2. Environment Variables
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```
Default values:
```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/kyc-flow
JWT_SECRET=kyc-flow-dev-secret-super-secure-key-2026
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=./uploads
NODE_ENV=development
```

### 3. Seed Database
Seed the database with 6 staff roles, 12 applicants, 21 KYC cases across all workflow states, policies, and audit logs:
```bash
npm run seed
```

### 4. Run the Full Application
Start both the Express API server and the Vite client concurrently:
```bash
npm run dev
```
- **Web Application:** [http://localhost:5173](http://localhost:5173)
- **API Server:** [http://localhost:4000/api](http://localhost:4000/api)
- **Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)

Alternatively, run them in separate terminal windows:
```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

---

## 6. Seeded Demo Accounts

All seeded staff accounts use the password: `Password123!`

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| **Reviewer** | `reviewer@kycflow.dev` | `Password123!` | Review queue, inspect cases, approve, reject, escalate |
| **Senior Reviewer** | `senior@kycflow.dev` | `Password123!` | All reviewer tools, reveal masked PII, Four-Eyes override |
| **Compliance Officer** | `compliance@kycflow.dev` | `Password123!` | Consent ledger, DSAR erasure wizard, retention schedules, audit log |
| **Administrator** | `admin@kycflow.dev` | `Password123!` | User management, role changes, telemetry, decision thresholds |
| **ML Engineer** | `ml@kycflow.dev` | `Password123!` | Model registry, accuracy/FMR metrics, drift graphs, retraining triggers |
| **Auditor** | `auditor@kycflow.dev` | `Password123!` | Read-only access to audit logs, compliance reports, and chains |

### Applicant Verification Credentials
- Contact Verification: Any valid email or phone number.
- Development OTP: `123456`

---

## 7. End-to-End Walkthrough Scenarios

### Scenario A: Applicant Verification
1. Navigate to [http://localhost:5173](http://localhost:5173) and click **"Start Verification"**.
2. **Contact:** Enter an email (e.g. `applicant@example.com`). Notice the development OTP `123456` displayed in dev mode. Click Verify.
3. **Biometric Consent:** Read the clear privacy & retention policy. Check the explicit biometric consent checkbox and click **"Grant Consent & Continue"**.
4. **Document Capture:** Select Country (e.g., India, USA, UK) and Document Type (Passport, National ID, Driver License). Upload Front and Back images. Observe real-time quality checks (resolution, blur, glare, brightness).
5. **Selfie & Liveness:** Allow camera access (or use upload fallback). Align face in the oval guide and capture. Passive liveness test executes immediately.
6. **Review & Submit:** Review masked personal details and click **"Submit Verification"**.
7. **Live Status Stepper:** Observe the asynchronous background transition from `QUEUED` → `PROCESSING` → `AUTO_APPROVED` / `MANUAL_REVIEW`.

### Scenario B: Reviewer Inspection & Senior Four-Eyes Override
1. Log in at [http://localhost:5173/staff/login](http://localhost:5173/staff/login) as `reviewer@kycflow.dev`.
2. Open **Review Queue**; filter by risk tier, document type, or status (`MANUAL_REVIEW`).
3. Click on a case (e.g., `CASE-100002`).
4. Inspect the 3-column view:
   - **Left:** Document images, zoom, rotate, and tamper heatmap toggle.
   - **Center:** Extracted OCR fields with individual confidence scores. Notice PII is masked by default (`J*** D**`, `••••2910`).
   - **Right:** Face comparison (selfie vs ID crop), similarity score, liveness score, and risk flags.
5. Attempting to click **"Reveal PII"** shows an error or prompts for senior permissions.
6. Log out and log in as `senior@kycflow.dev`.
7. Click **"Reveal PII"**, input the mandatory business justification (e.g. `"Auditing name character discrepancy"`), and confirm. Unmasked PII is revealed and an immutable audit event is recorded.
8. If the case was auto-rejected, click **"Senior Override"** to reverse the decision.

### Scenario C: Compliance & DSAR Erasure
1. Log in as `compliance@kycflow.dev`.
2. Navigate to **Compliance Console**:
   - **Consent Ledger:** View immutable biometric consent records with SHA-256 consent text hashes.
   - **DSAR Requests:** Select a pending deletion request and click **"Execute Erasure"**. The backend physically removes the stored files on disk, deletes personal identifiers, updates state to `ERASED`, and logs a tamper-evident audit record.
   - **Retention Schedule:** Inspect legal hold flags and retention schedules.

### Scenario D: MLOps Telemetry & Drift Monitoring
1. Log in as `ml@kycflow.dev` and open the **MLOps Dashboard**.
2. Inspect the production model versions: PaddleOCR v3.1, ArcFace v2.4, AntiSpoof v1.8, ELA-FFT v1.2.
3. Review charts powered by Recharts: OCR confidence distributions, face similarity distributions, latency percentiles, and PSI/KS drift monitors.

---

## 8. API Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/request-otp` | Request dev OTP for contact verification | Public |
| `POST` | `/api/auth/verify-otp` | Verify OTP and issue session token | Public |
| `POST` | `/api/auth/login` | Staff JWT authentication | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Bearer Token |
| `POST` | `/api/sessions` | Create applicant session | Bearer Token |
| `POST` | `/api/consents` | Record explicit biometric consent | Bearer Token |
| `DELETE`| `/api/consents/:id` | Withdraw biometric consent | Bearer Token |
| `POST` | `/api/cases` | Create new KYC verification case | Bearer Token |
| `GET` | `/api/cases/:id` | Retrieve case details | Bearer Token |
| `POST` | `/api/cases/:id/documents` | Upload front/back document artifacts | Bearer Token |
| `POST` | `/api/cases/:id/selfie` | Upload selfie artifact | Bearer Token |
| `POST` | `/api/cases/:id/submit` | Enqueue case for AI processing (returns 202) | Bearer Token |
| `GET` | `/api/cases/:id/status` | Real-time case state & result | Bearer Token |
| `GET` | `/api/reviews/queue` | Paginated review queue with filters | Reviewer+ |
| `GET` | `/api/reviews/:caseId` | Reviewer case detail (masked PII) | Reviewer+ |
| `POST` | `/api/reviews/:caseId/claim` | Claim case assignment | Reviewer+ |
| `POST` | `/api/reviews/:caseId/approve`| Approve case | Reviewer+ |
| `POST` | `/api/reviews/:caseId/reject` | Reject case with reason code | Reviewer+ |
| `POST` | `/api/reviews/:caseId/resubmit`| Request document resubmission | Reviewer+ |
| `POST` | `/api/reviews/:caseId/escalate`| Escalate case to Senior Reviewer | Reviewer+ |
| `POST` | `/api/reviews/:caseId/reveal-pii` | Senior unmasking with audit justification | Senior Reviewer+ |
| `POST` | `/api/reviews/:caseId/override` | Senior Four-Eyes decision override | Senior Reviewer+ |
| `GET` | `/api/compliance/consents`| List consent ledger entries | Compliance+ |
| `GET` | `/api/compliance/dsar` | List DSAR access/erasure requests | Compliance+ |
| `POST` | `/api/compliance/dsar/:id/execute` | Execute physical erasure | Compliance+ |
| `GET` | `/api/compliance/audit` | Query hash-chained audit log | Compliance / Auditor |
| `GET` | `/api/admin/users` | List staff users | Admin |
| `PATCH`| `/api/admin/users/:id/role`| Modify staff user role | Admin |
| `GET` | `/api/admin/policies` | Retrieve decision engine threshold rules | Admin |
| `PATCH`| `/api/admin/policies/:id`| Update policy threshold values | Admin |
| `GET` | `/api/mlops/models` | Model registry status | ML Engineer / Admin |
| `GET` | `/api/mlops/metrics` | Accuracy and inference latency metrics | ML Engineer / Admin |
| `GET` | `/api/mlops/drift` | PSI/KS feature and score drift metrics | ML Engineer / Admin |

---

## 9. Automated Testing

Run the automated test suite in the server:
```bash
npm run test
```
The test suite validates:
- API health and server initialization
- Staff authentication with seeded accounts and rejection of invalid credentials
- Applicant contact verification and development OTP issuance (`123456`)
- Decision engine rule evaluations:
  - `AUTO_APPROVE` when all biometric and document criteria pass
  - `AUTO_REJECT` when documents are expired
  - `MANUAL_REVIEW` when face similarity is below threshold
- PII masking utilities (`maskName`, `maskIdNumber`, `maskDob`)
- RBAC security checks: rejection of normal reviewer attempting to unmask PII (HTTP 403) and authorization of senior reviewer with justification (HTTP 200).

---

## 10. AI Pipeline Architecture & Future Roadmap

### Current MVP Implementation
The current build uses clean TypeScript service interfaces (`ocr.service.ts`, `face.service.ts`, `liveness.service.ts`, `tamper.service.ts`) yielding realistic, deterministic results based on case IDs and artifact inputs. This avoids requiring multi-gigabyte heavy Python ML binaries or GPU drivers for local MVP evaluation.

### Production AI Migration Path
The codebase includes the ready-to-use `FuturePythonAIService` adapter. To deploy the full production AI stack:
1. **OCR:** Deploy `PaddleOCR` (v3.1) in a FastAPI container targeting passport MRZ and national ID visual inspection zones.
2. **Face Matching:** Deploy `DeepFace` with `ArcFace` / `RetinaFace` embeddings.
3. **Liveness:** Integrate passive texture/depth CNNs (Silent-Face-Anti-Spoofing) with challenge-response active gestures (blink, head turn).
4. **Tamper Detection:** Deploy OpenCV-based Error Level Analysis (ELA) and Fast Fourier Transform (FFT) high-frequency analysis.
5. **Message Broker:** Switch `getJobQueue()` in `server/src/jobs/` from `LocalJobQueue` to `RabbitMQJobQueue` with quorum queues.
6. **Storage:** Switch `getStorageProvider()` in `server/src/storage/` from `LocalStorageProvider` to `S3StorageProvider`.

---

## 11. Security & Compliance Measures

- **No Secrets in Code:** Configuration isolated in environment variables.
- **Biometric Data Segregation:** Unbundled consent with cryptographic text hashes (`SHA-256`).
- **PII Masking by Default:** Strict data minimization on all read endpoints; unmasking requires senior role and justification.
- **Tamper-Evident Audit Trail:** Every sensitive mutation appends an audit event with chained SHA-256 hashes (`currentHash = SHA256(prevHash + eventData)`).
- **Physical Erasure on DSAR:** Hard-deletes disk artifacts upon compliance officer verification.
- **Defensive Headers:** Helmet security headers, restrictive CORS allowlist, and express rate limiting.

---

## 12. License
Internal KYC-Flow MVP. All rights reserved.
