# AI/ML Model Integration

How PaddleOCR, DeepFace, OpenCV, liveness and tamper models are integrated, served, evaluated and governed. Pipeline/monitoring jobs: `Data analysis pipeline.md`.

## 1. Model inventory
| Capability | Primary tool | Output | Replaceable via |
|---|---|---|---|
| Image pre-processing | OpenCV | cleaned image + quality metrics | versioned library |
| OCR + layout | **PaddleOCR** (PP-OCR, PP-StructureV3) | text, boxes, confidences, structured JSON | model registry |
| Document validation | rules + MRZ parser | validity flags | config |
| Face detect/align/embed/verify | **DeepFace** (ArcFace / FaceNet / VGG-Face; detectors e.g. RetinaFace) | embeddings, distance, threshold, match | `model`/`detector` params |
| Passive liveness | dedicated anti-spoof CNN (evaluate open options) | live probability | registry |
| Active liveness | challenge-response + head-pose/blink estimation | challenge pass/fail | registry |
| Tamper detection | **ELA, FFT spectral**, EXIF/metadata, template checks | tamper score + heatmap | OpenCV code |

## 2. Pipeline stages in detail
### 2.1 Pre-processing (OpenCV)
Decode safely → orientation fix → document edge detection/perspective crop → **deskew** → **glare suppression** → **contrast normalization** (CLAHE) → **denoise** → quality metrics (blur variance of Laplacian, glare ratio, brightness, resolution). Poor quality → `NEEDS_RESUBMISSION` with specific hint instead of passing garbage downstream.
### 2.2 OCR (PaddleOCR)
- Detection → recognition → (optional) angle classification; PP-StructureV3 for layout → JSON.
- Post-processing: per-field mapping by document template/country; regex + checksum validation; MRZ parse (ICAO 9303 check digits); normalize dates/names; cross-check visual zone vs MRZ.
- Output: per-field value + confidence + bounding box; low-confidence fields flagged.
### 2.3 Face verification (DeepFace)
- Extract face from ID photo and selfie (detect, align).
- `represent`/`verify` with chosen model + distance metric; compare distance to model-specific threshold.
- Store distance, threshold, model, detector, version. Operating threshold is **calibrated** for target FMR (e.g. 1e-5) on the golden dataset, not simply the library default.
- Edge cases: multiple faces, no face, occlusion, age gap, low-res ID photo, glasses/hijab/beards (fairness testing).
### 2.4 Liveness
- **Passive:** single/multi-frame analysis (texture, moiré, reflection, depth cues, micro-movement) → probability.
- **Active:** server-generated random challenge (turn left/right, blink) → pose estimation verifies sequence timing; nonce + expiry for anti-replay.
- **Policy:** passive for all; active if passive borderline, high-risk tier, or jurisdiction policy. Trade-off: active reduces spoofing but adds friction.
- Check for injection attacks (virtual camera, re-encoded streams) via metadata/frame-timing heuristics.
- Validate DeepFace's built-in anti-spoofing (if used) against your attack set; otherwise adopt/benchmark a dedicated model.
### 2.5 Tamper detection
ELA (re-compression error maps), FFT spectral anomalies, EXIF/software tags, font/alignment/template consistency, MRZ-vs-visual mismatch, copy-move heuristics. Output score + heatmap saved as evidence.

## 3. Serving architecture
- Each capability = own worker Deployment (independent scaling, resource profile, failure isolation).
- **Model loading at startup** (readiness gate), shared weights baked into image or mounted read-only from internal registry (checksum verified); warm-up inference on boot.
- Concurrency: one model instance per process; tune workers/threads to CPU cores; batch only if latency budget allows.
- **Autoscaling:** KEDA on RabbitMQ queue length; scale-to-zero optional; keep ≥ 1 warm replica if cold-start (model load) exceeds SLO.
- **Resources:** requests = limits (Guaranteed QoS); memory sized for peak model + image; GPU node pool optional (time-slicing/MIG) once CPU latency or volume is insufficient.
- **RabbitMQ consumption:** manual ack after result publish; prefetch tuned from avg task time (start 1 for long tasks); retries with backoff → DLQ.
- **Idempotency:** deterministic result keyed by `caseId+task+modelVersion`; reprocessing allowed on model upgrade.
- **Version routing:** orchestrator decides `modelVersion` per case (supports canary %); versions recorded in the case.

## 4. Interfaces (contracts)
Task message:
```json
{ "caseId":"case_...", "task":"ocr", "attempt":1, "artifacts":[{"id":"art_front","s3Key":"cases/.../id_front.jpg"}],
  "modelVersion":"ocr-3.1.0", "policyVersion":12, "traceId":"..." }
```
Result message:
```json
{ "caseId":"case_...", "task":"ocr", "status":"ok", "modelVersion":"ocr-3.1.0",
  "result": { "fields": { "dob": {"value":"1990-01-01","conf":0.95,"box":[...]} } },
  "metrics": { "latencyMs": 820, "inputStats": {"blur":0.9,"glare":0.1} }, "evidence":[{"kind":"ocr_overlay","s3Key":"..."}] }
```
Payloads carry S3 references and IDs, not images or raw PII.

## 5. Evaluation framework
### 5.1 Golden dataset
Curated, lawfully obtained, DVC-versioned, stratified by country, doc type, device, lighting, demographics (where lawful), plus **attack set** (print, screen replay, mask, deepfake, edited IDs). Access restricted; refreshed periodically; never used for training of the same model version it gates.
### 5.2 Metrics & gates (starting hypotheses)
| Component | Metrics | Gate to promote |
|---|---|---|
| OCR | CER, WER, critical-field accuracy, MRZ pass rate | no regression beyond agreed delta vs current prod; absolute floor set from baseline |
| Face | FMR, FNMR at operating threshold; ROC/DET | FMR ≤ target (e.g. 1e-5); FNMR not worse than prod by delta |
| Liveness | APCER, BPCER (per attack type) | APCER ≤ risk-owner target; BPCER ≤ UX target |
| Tamper | precision/recall on forged set | agreed floor |
| Fairness | metric gap across slices | gap ≤ agreed bound |
| Latency | P50/P95 per stage, memory | within SLO budget |
### 5.3 Behavioral tests (CI)
Invariance (rotation, small blur), directional (worse quality → lower confidence), minimum-functionality (known easy samples must pass), regression suite of past failures.

## 6. MLOps lifecycle
| Stage | Tooling |
|---|---|
| Data versioning | DVC (remote in S3) |
| Experiments & registry | MLflow (params, metrics, artifacts, stages: None → Staging → Production → Archived) |
| Validation | Great Expectations (data), custom eval harness (model) |
| Drift monitoring | Evidently + Prometheus/Grafana; PSI, KS |
| Orchestration | Airflow retraining DAG |
| Feature consistency | shared preprocessing package; Feast optional |
| Deployment | Argo CD + canary (orchestrator routing); rollback = previous registry version |
| Lineage | commit SHA + data version + model version stored per inference |
Rationale: ML models degrade silently as production data shifts; the report cites a study where 91% of model/dataset pairs showed temporal degradation, so monitoring and retraining are mandatory, not optional.

## 7. Responsible AI & governance
- **Explainability:** store reason codes, scores, evidence overlays; reviewers can see why.
- **Human in the loop:** gray-zone and negative outcomes can be reviewed; applicants can appeal (important under GDPR rules on solely automated decisions; confirm with counsel).
- **Bias:** stratified evaluation, fairness gates, documented limitations (model card per model).
- **Model cards & datasheets:** intended use, training data, metrics, known failure modes.
- **Licensing:** audit each model weight (code license ≠ weights license; some face-recognition weights restrict commercial use). Record in a license register; swap models if needed.
- **Security:** signed artifacts, checksum verification, no pickle from untrusted sources, isolated workers.
- **Data use:** biometrics from production only used for retraining with explicit lawful basis/consent.

## 8. Performance tuning checklist
Resize inputs to model-appropriate size early; avoid repeated decode; reuse model sessions; enable CPU optimizations (MKL-DNN/OpenVINO/ONNX Runtime where supported); consider ONNX/TensorRT on GPU; profile per stage (PaddleOCR benchmarking tools); cache embeddings within a case only; cap image megapixels.

## 9. Integration testing
End-to-end tests with synthetic IDs and selfies in CI; chaos test killing workers mid-task; load test with representative image sizes; spoof-suite regression on every liveness/face model change.

## 10. Open questions to resolve in early spirals
1. Which passive-liveness model meets APCER/BPCER on our attack set? (Spiral 1-2)
2. Which DeepFace model/detector combo gives best FNMR at FMR 1e-5 on our demographics? (Spiral 1-3)
3. CPU-only latency vs GPU need at expected volume? (Spiral 3)
4. Supported document types/countries for v1 and templates per country? (Spiral 0-1)
