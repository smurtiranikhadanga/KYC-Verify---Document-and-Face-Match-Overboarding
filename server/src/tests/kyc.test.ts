import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../jobs/seed.js';
import { DecisionService } from '../ai/decision.service.js';
import { maskCaseData, maskName, maskIdNumber, maskDob } from '../utils/masking.utils.js';

describe('KYC-Flow Core Automated Test Suite', () => {
  let reviewerToken = '';
  let seniorToken = '';
  let adminToken = '';
  let applicantSessionId = '';

  beforeAll(async () => {
    await connectDB();
    await seedDatabase();
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  // 1. Health & Server Boot
  it('GET /api/health should return 200 OK with service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('KYC-Flow');
  });

  // 2. Authentication: Staff Login
  it('POST /api/auth/login should authenticate seeded reviewer', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'reviewer@kycflow.dev',
      password: 'Password123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('reviewer');
    reviewerToken = res.body.data.token;
  });

  it('POST /api/auth/login should authenticate seeded senior reviewer', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'senior@kycflow.dev',
      password: 'Password123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    seniorToken = res.body.data.token;
  });

  it('POST /api/auth/login should reject invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'reviewer@kycflow.dev',
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 3. Applicant OTP Flow
  it('POST /api/auth/request-otp should return development OTP 123456', async () => {
    const res = await request(app).post('/api/auth/request-otp').send({
      contactType: 'email',
      contactValue: 'test.user@example.com',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.devOtp).toBe('123456');
    expect(res.body.data.sessionId).toBeDefined();
    applicantSessionId = res.body.data.sessionId;
  });

  it('POST /api/auth/verify-otp should verify OTP and return applicant session token', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({
      sessionId: applicantSessionId,
      otpCode: '123456',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.applicantId).toBeDefined();
    expect(res.body.data.token).toBeDefined();
  });

  // 4. Decision Engine Rules Unit Tests
  describe('Decision Engine Rules', () => {
    const decisionService = new DecisionService();

    it('should AUTO_APPROVE when all checks meet thresholds', () => {
      const result = decisionService.evaluateDecision(
        { blur: 0.08, glare: 0.05, brightness: 0.9, score: 0.94, passed: true },
        {
          engine: 'PaddleOCR',
          version: '3.1',
          fields: {
            fullName: { value: 'Asha Patel', confidence: 0.98 },
            dob: { value: '1995-05-10', confidence: 0.96 },
            idNumber: { value: 'Z1234567', confidence: 0.97 },
            expiry: { value: '2030-01-01', confidence: 0.99 },
          },
          mrzValid: true,
          latencyMs: 300,
        },
        { expired: false, formatOk: true, crossFieldOk: true, details: [] },
        { model: 'ArcFace', detector: 'RetinaFace', similarity: 0.94, distance: 0.06, threshold: 0.8, match: true, confidence: 0.95, latencyMs: 300 },
        { score: 0.96, threshold: 0.85, method: 'passive', passed: true, latencyMs: 250 },
        { ela: 0.08, fft: 0.05, score: 0.07, flagged: false, metadataFlags: [], latencyMs: 200 }
      );

      expect(result.outcome).toBe('AUTO_APPROVED');
      expect(result.riskScore).toBeLessThan(30);
    });

    it('should AUTO_REJECT when document is expired', () => {
      const result = decisionService.evaluateDecision(
        { blur: 0.08, glare: 0.05, brightness: 0.9, score: 0.94, passed: true },
        {
          engine: 'PaddleOCR',
          version: '3.1',
          fields: {
            fullName: { value: 'Asha Patel', confidence: 0.98 },
            dob: { value: '1995-05-10', confidence: 0.96 },
            idNumber: { value: 'Z1234567', confidence: 0.97 },
            expiry: { value: '2020-01-01', confidence: 0.99 },
          },
          mrzValid: true,
          latencyMs: 300,
        },
        { expired: true, formatOk: true, crossFieldOk: true, details: ['DOCUMENT_EXPIRED'] },
        { model: 'ArcFace', detector: 'RetinaFace', similarity: 0.94, distance: 0.06, threshold: 0.8, match: true, confidence: 0.95, latencyMs: 300 },
        { score: 0.96, threshold: 0.85, method: 'passive', passed: true, latencyMs: 250 },
        { ela: 0.08, fft: 0.05, score: 0.07, flagged: false, metadataFlags: [], latencyMs: 200 }
      );

      expect(result.outcome).toBe('AUTO_REJECTED');
      expect(result.reasonCodes).toContain('DOCUMENT_EXPIRED');
    });

    it('should flag MANUAL_REVIEW when face similarity is below threshold', () => {
      const result = decisionService.evaluateDecision(
        { blur: 0.08, glare: 0.05, brightness: 0.9, score: 0.94, passed: true },
        {
          engine: 'PaddleOCR',
          version: '3.1',
          fields: {
            fullName: { value: 'Asha Patel', confidence: 0.98 },
            dob: { value: '1995-05-10', confidence: 0.96 },
            idNumber: { value: 'Z1234567', confidence: 0.97 },
            expiry: { value: '2030-01-01', confidence: 0.99 },
          },
          mrzValid: true,
          latencyMs: 300,
        },
        { expired: false, formatOk: true, crossFieldOk: true, details: [] },
        { model: 'ArcFace', detector: 'RetinaFace', similarity: 0.74, distance: 0.26, threshold: 0.8, match: false, confidence: 0.72, latencyMs: 300 },
        { score: 0.92, threshold: 0.85, method: 'passive', passed: true, latencyMs: 250 },
        { ela: 0.08, fft: 0.05, score: 0.07, flagged: false, metadataFlags: [], latencyMs: 200 }
      );

      expect(result.outcome).toBe('MANUAL_REVIEW');
      expect(result.reasonCodes).toContain('LOW_FACE_MATCH');
    });
  });

  // 5. Masking Utility Unit Tests
  describe('PII Masking Utilities', () => {
    it('should properly mask full name into initial and asterisks', () => {
      expect(maskName('Asha Patel')).toBe('A*** P****');
    });

    it('should mask ID number preserving only last 4 digits', () => {
      expect(maskIdNumber('Z8472910')).toBe('••••2910');
    });

    it('should mask date of birth preserving only year', () => {
      expect(maskDob('1996-08-14')).toBe('XX/XX/1996');
    });
  });

  // 6. RBAC & Security: PII Reveal Authorization
  it('POST /api/reviews/:caseId/reveal-pii should reject reviewer role (senior required)', async () => {
    const res = await request(app)
      .post('/api/reviews/CASE-100002/reveal-pii')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ justification: 'Checking ID character discrepancies for fraud audit' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/reviews/:caseId/reveal-pii should allow senior reviewer with valid justification', async () => {
    const res = await request(app)
      .post('/api/reviews/CASE-100002/reveal-pii')
      .set('Authorization', `Bearer ${seniorToken}`)
      .send({ justification: 'Investigating potential optical reflection over visual name zone' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.document.ocr.fields.fullName.value).toBeDefined();
  });
});
