import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/user.model.js';
import { Applicant } from '../models/applicant.model.js';
import { KycCase } from '../models/case.model.js';
import { Consent } from '../models/consent.model.js';
import { ReviewTask } from '../models/review-task.model.js';
import { AuditLog, createAuditEntry } from '../models/audit-log.model.js';
import { DSARRequest } from '../models/dsar.model.js';
import { Policy } from '../models/policy.model.js';
import { ModelRun } from '../models/model-run.model.js';
import { AnalyticsDaily } from '../models/analytics-daily.model.js';

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Starting database seeding for KYC-Flow...');
  await connectDB();

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Applicant.deleteMany({}),
    KycCase.deleteMany({}),
    Consent.deleteMany({}),
    ReviewTask.deleteMany({}),
    AuditLog.deleteMany({}),
    DSARRequest.deleteMany({}),
    Policy.deleteMany({}),
    ModelRun.deleteMany({}),
    AnalyticsDaily.deleteMany({}),
  ]);

  const defaultPassword = await bcrypt.hash('Password123!', 10);

  // 1. Seed Staff Users
  const staffData = [
    {
      name: 'Aditi Rao (Admin)',
      email: 'admin@kycflow.dev',
      passwordHash: defaultPassword,
      role: 'admin',
      department: 'Platform Engineering',
      region: 'global',
    },
    {
      name: 'Ravi Kumar (Reviewer)',
      email: 'reviewer@kycflow.dev',
      passwordHash: defaultPassword,
      role: 'reviewer',
      department: 'Operations',
      region: 'APAC',
    },
    {
      name: 'Elena Rostova (Senior Reviewer)',
      email: 'senior@kycflow.dev',
      passwordHash: defaultPassword,
      role: 'senior_reviewer',
      department: 'Senior Operations & Fraud',
      region: 'global',
    },
    {
      name: 'Carla Mendez (Compliance)',
      email: 'compliance@kycflow.dev',
      passwordHash: defaultPassword,
      role: 'compliance_officer',
      department: 'Legal & Risk Governance',
      region: 'EU-GDPR',
    },
    {
      name: 'Mei Lin (ML Engineer)',
      email: 'ml@kycflow.dev',
      passwordHash: defaultPassword,
      role: 'ml_engineer',
      department: 'Applied AI & Computer Vision',
      region: 'global',
    },
    {
      name: 'Arthur Pendelton (Auditor)',
      email: 'auditor@kycflow.dev',
      passwordHash: defaultPassword,
      role: 'auditor',
      department: 'Internal Audit & Regulatory Reporting',
      region: 'global',
    },
  ];

  const createdStaff = await User.insertMany(staffData);
  console.log(`[Seed] Seeded ${createdStaff.length} staff members.`);
  const reviewerUser = createdStaff.find((u) => u.role === 'reviewer');

  // 2. Seed Policy Configuration
  const defaultPolicy = await Policy.create({
    name: 'Global Standard Tier Policy',
    version: 1,
    jurisdiction: 'GLOBAL',
    riskTier: 'standard',
    faceMatchThreshold: 0.80,
    livenessThreshold: 0.85,
    tamperThreshold: 0.70,
    ocrConfidenceThreshold: 0.80,
    autoApproveAllowed: true,
    activeLivenessRequired: false,
    retentionDaysBiometric: 30,
    retentionDaysId: 1825,
    updatedBy: 'admin@kycflow.dev',
  });

  // 3. Seed Applicants (12 applicants)
  const applicantsData = [
    { email: 'asha.patel@example.com', country: 'IN' },
    { email: 'liam.smith@example.co.uk', country: 'GB' },
    { email: 'marcus.weber@example.de', country: 'DE' },
    { email: 'sofia.rodriguez@example.es', country: 'ES' },
    { email: 'tariq.mansoor@example.ae', country: 'AE' },
    { email: 'chloe.dubois@example.fr', country: 'FR' },
    { email: 'kenji.sato@example.jp', country: 'JP' },
    { email: 'ananya.deshmukh@example.com', country: 'IN' },
    { email: 'lucas.silva@example.com.br', country: 'BR' },
    { email: 'zara.al-hassan@example.com', country: 'SA' },
    { email: 'david.kim@example.kr', country: 'KR' },
    { email: 'olivia.johnson@example.com', country: 'US' },
  ].map((a) => ({
    ...a,
    emailHash: crypto.createHash('sha256').update(a.email).digest('hex'),
    status: 'active',
  }));

  const createdApplicants = await Applicant.insertMany(applicantsData);
  console.log(`[Seed] Seeded ${createdApplicants.length} applicants.`);

  // 4. Seed KYC Cases (> 20 realistic cases)
  const caseTemplates = [
    {
      state: 'AUTO_APPROVED',
      riskScore: 12,
      riskFlags: [],
      docType: 'passport',
      country: 'IN',
      name: 'Asha Patel',
      dob: '1996-08-14',
      idNumber: 'Z8472910',
      similarity: 0.94,
      liveness: 0.97,
      tamper: 0.08,
      ocrConf: 0.98,
      ageHours: 1,
    },
    {
      state: 'AUTO_APPROVED',
      riskScore: 15,
      riskFlags: [],
      docType: 'national_id',
      country: 'GB',
      name: 'Liam Smith',
      dob: '1992-03-22',
      idNumber: 'GB4402199',
      similarity: 0.91,
      liveness: 0.95,
      tamper: 0.09,
      ocrConf: 0.96,
      ageHours: 3,
    },
    {
      state: 'MANUAL_REVIEW',
      riskScore: 68,
      riskFlags: ['LOW_FACE_MATCH', 'LIGHTING_LOW'],
      docType: 'driver_license',
      country: 'DE',
      name: 'Marcus Weber',
      dob: '1989-11-05',
      idNumber: 'D90123841',
      similarity: 0.76, // Below 0.80
      liveness: 0.89,
      tamper: 0.12,
      ocrConf: 0.94,
      ageHours: 4,
    },
    {
      state: 'MANUAL_REVIEW',
      riskScore: 72,
      riskFlags: ['TAMPER_SUSPECT', 'EXIF_METADATA_ANOMALY'],
      docType: 'passport',
      country: 'ES',
      name: 'Sofia Rodriguez',
      dob: '1995-07-19',
      idNumber: 'P2930419',
      similarity: 0.92,
      liveness: 0.91,
      tamper: 0.74, // Above 0.70
      ocrConf: 0.93,
      ageHours: 2,
    },
    {
      state: 'MANUAL_REVIEW',
      riskScore: 65,
      riskFlags: ['LIVENESS_BORDERLINE'],
      docType: 'national_id',
      country: 'AE',
      name: 'Tariq Mansoor',
      dob: '1987-05-12',
      idNumber: 'AE7841992',
      similarity: 0.88,
      liveness: 0.81, // Below 0.85
      tamper: 0.14,
      ocrConf: 0.95,
      ageHours: 5,
    },
    {
      state: 'NEEDS_RESUBMISSION',
      riskScore: 35,
      riskFlags: ['OCR_UNREADABLE_FIELD', 'POOR_IMAGE_QUALITY'],
      docType: 'passport',
      country: 'FR',
      name: 'Chloe Dubois',
      dob: '1998-12-01',
      idNumber: 'FR901234',
      similarity: 0.89,
      liveness: 0.92,
      tamper: 0.11,
      ocrConf: 0.65, // Low OCR confidence
      ageHours: 8,
    },
    {
      state: 'AUTO_REJECTED',
      riskScore: 92,
      riskFlags: ['EXPIRED_DOCUMENT', 'HIGH_RISK_FRAUD_INDICATOR'],
      docType: 'driver_license',
      country: 'US',
      name: 'Olivia Johnson',
      dob: '1984-06-18',
      idNumber: 'DL4910283',
      similarity: 0.62,
      liveness: 0.70,
      tamper: 0.82,
      ocrConf: 0.91,
      expired: true,
      ageHours: 12,
    },
    {
      state: 'APPROVED',
      riskScore: 18,
      riskFlags: [],
      docType: 'passport',
      country: 'JP',
      name: 'Kenji Sato',
      dob: '1991-09-30',
      idNumber: 'TR882910',
      similarity: 0.93,
      liveness: 0.96,
      tamper: 0.07,
      ocrConf: 0.97,
      ageHours: 24,
    },
    {
      state: 'REJECTED',
      riskScore: 88,
      riskFlags: ['BIOMETRIC_MISMATCH', 'SYNTHETIC_FACE_SUSPECT'],
      docType: 'passport',
      country: 'BR',
      name: 'Lucas Silva',
      dob: '1993-04-14',
      idNumber: 'BR559012',
      similarity: 0.54,
      liveness: 0.68,
      tamper: 0.65,
      ocrConf: 0.92,
      ageHours: 36,
    },
    {
      state: 'PROCESSING',
      riskScore: 20,
      riskFlags: [],
      docType: 'national_id',
      country: 'IN',
      name: 'Ananya Deshmukh',
      dob: '2000-01-25',
      idNumber: 'Z1029384',
      similarity: 0.92,
      liveness: 0.94,
      tamper: 0.08,
      ocrConf: 0.95,
      ageHours: 0.2,
    },
    {
      state: 'QUEUED',
      riskScore: 0,
      riskFlags: [],
      docType: 'passport',
      country: 'SA',
      name: 'Zara Al-Hassan',
      dob: '1997-10-10',
      idNumber: 'SA991028',
      similarity: 0,
      liveness: 0,
      tamper: 0,
      ocrConf: 0,
      ageHours: 0.1,
    },
    // Extra batch to reach 22 cases
    {
      state: 'AUTO_APPROVED',
      riskScore: 14,
      riskFlags: [],
      docType: 'passport',
      country: 'KR',
      name: 'David Kim',
      dob: '1994-02-17',
      idNumber: 'M9018274',
      similarity: 0.95,
      liveness: 0.98,
      tamper: 0.06,
      ocrConf: 0.99,
      ageHours: 14,
    },
    {
      state: 'MANUAL_REVIEW',
      riskScore: 62,
      riskFlags: ['LIVENESS_BORDERLINE'],
      docType: 'national_id',
      country: 'IN',
      name: 'Rohan Mehra',
      dob: '1993-08-11',
      idNumber: 'Z3918274',
      similarity: 0.86,
      liveness: 0.82,
      tamper: 0.11,
      ocrConf: 0.94,
      ageHours: 6,
    },
    {
      state: 'MANUAL_REVIEW',
      riskScore: 66,
      riskFlags: ['LOW_FACE_MATCH'],
      docType: 'driver_license',
      country: 'GB',
      name: 'George Taylor',
      dob: '1986-12-04',
      idNumber: 'UK4910291',
      similarity: 0.77,
      liveness: 0.91,
      tamper: 0.13,
      ocrConf: 0.95,
      ageHours: 7,
    },
    {
      state: 'NEEDS_RESUBMISSION',
      riskScore: 40,
      riskFlags: ['GLARE_DETECTED_OVER_EXPIRY'],
      docType: 'passport',
      country: 'DE',
      name: 'Hannah Schmidt',
      dob: '1999-05-30',
      idNumber: 'D4491028',
      similarity: 0.90,
      liveness: 0.93,
      tamper: 0.09,
      ocrConf: 0.71,
      ageHours: 9,
    },
    {
      state: 'AUTO_APPROVED',
      riskScore: 11,
      riskFlags: [],
      docType: 'passport',
      country: 'IN',
      name: 'Vikram Sethi',
      dob: '1990-11-20',
      idNumber: 'Z5819204',
      similarity: 0.96,
      liveness: 0.97,
      tamper: 0.05,
      ocrConf: 0.98,
      ageHours: 16,
    },
    {
      state: 'APPROVED',
      riskScore: 22,
      riskFlags: [],
      docType: 'national_id',
      country: 'ES',
      name: 'Carlos Ruiz',
      dob: '1992-09-15',
      idNumber: 'E9910284',
      similarity: 0.89,
      liveness: 0.94,
      tamper: 0.10,
      ocrConf: 0.96,
      ageHours: 40,
    },
    {
      state: 'REJECTED',
      riskScore: 95,
      riskFlags: ['TAMPER_ANOMALY_DETECTED', 'MRZ_CHECKSUM_INVALID'],
      docType: 'passport',
      country: 'US',
      name: 'Robert Hayes',
      dob: '1979-04-03',
      idNumber: 'US1029384',
      similarity: 0.70,
      liveness: 0.75,
      tamper: 0.88,
      ocrConf: 0.82,
      ageHours: 50,
    },
    {
      state: 'MANUAL_REVIEW',
      riskScore: 58,
      riskFlags: ['ADDRESS_FIELD_LOW_CONFIDENCE'],
      docType: 'driver_license',
      country: 'IN',
      name: 'Kavita Nair',
      dob: '1995-03-29',
      idNumber: 'Z9018274',
      similarity: 0.91,
      liveness: 0.94,
      tamper: 0.12,
      ocrConf: 0.83,
      ageHours: 4.5,
    },
    {
      state: 'AUTO_APPROVED',
      riskScore: 13,
      riskFlags: [],
      docType: 'passport',
      country: 'GB',
      name: 'Emma Watson-Brown',
      dob: '1998-07-22',
      idNumber: 'GB9018274',
      similarity: 0.94,
      liveness: 0.96,
      tamper: 0.06,
      ocrConf: 0.99,
      ageHours: 20,
    },
    {
      state: 'MANUAL_REVIEW',
      riskScore: 70,
      riskFlags: ['BORDERLINE_LIVENESS', 'POTENTIAL_DISPLAY_REFLECTION'],
      docType: 'passport',
      country: 'FR',
      name: 'Julien Moreau',
      dob: '1991-01-14',
      idNumber: 'FR881920',
      similarity: 0.88,
      liveness: 0.83,
      tamper: 0.14,
      ocrConf: 0.94,
      ageHours: 3.2,
    },
  ];

  const now = Date.now();

  for (let i = 0; i < caseTemplates.length; i++) {
    const t = caseTemplates[i];
    const applicant = createdApplicants[i % createdApplicants.length];
    const caseId = `CASE-${(100000 + i).toString()}`;
    const createdAt = new Date(now - t.ageHours * 3600 * 1000);

    const kCase = await KycCase.create({
      caseId,
      applicantId: applicant._id,
      region: 'global',
      jurisdiction: t.country,
      documentType: t.docType,
      riskTier: t.riskScore >= 60 ? 'high' : 'standard',
      state: t.state as any,
      stateHistory: [
        { state: 'CREATED', at: createdAt, by: applicant.email || 'applicant' },
        { state: 'CONSENTED', at: new Date(createdAt.getTime() + 60000), by: t.name },
        { state: 'DOCS_UPLOADED', at: new Date(createdAt.getTime() + 180000), by: 'applicant' },
        { state: t.state as any, at: new Date(createdAt.getTime() + 240000), by: 'system_pipeline' },
      ],
      document: {
        type: t.docType,
        issuingCountry: t.country,
        artifactIds: [],
        frontImageUrl: `/uploads/mock/doc_${t.docType}_${t.country}.jpg`,
        backImageUrl: `/uploads/mock/doc_back.jpg`,
        ocr: {
          engine: 'PaddleOCR / PP-StructureV3',
          version: '3.1.0',
          fields: {
            fullName: { value: t.name, confidence: t.ocrConf, box: [45, 120, 320, 155] },
            dob: { value: t.dob, confidence: t.ocrConf, box: [45, 170, 200, 200] },
            idNumber: { value: t.idNumber, confidence: t.ocrConf, box: [45, 215, 260, 245] },
            expiry: { value: t.expired ? '2023-01-01' : '2031-10-15', confidence: t.ocrConf, box: [45, 260, 190, 290] },
            address: { value: '10 Downing Avenue, Central District', confidence: t.ocrConf - 0.05, box: [45, 305, 410, 340] },
          },
          mrzValid: !t.riskFlags.includes('MRZ_CHECKSUM_INVALID'),
          rawText: `P<${t.country}${t.name.replace(' ', '<<')}<<<<<<<<<<<<<<<<<<<\n${t.idNumber}<5${t.country}9501012M3110154<<<<<<<<<<<8`,
        },
        validation: {
          expired: Boolean(t.expired),
          formatOk: true,
          crossFieldOk: !t.riskFlags.includes('MRZ_CHECKSUM_INVALID'),
        },
        tamper: {
          ela: t.tamper,
          fft: Number((t.tamper * 0.8).toFixed(3)),
          metadataFlags: t.riskFlags.filter((f) => f.includes('TAMPER') || f.includes('METADATA')),
          score: t.tamper,
          flagged: t.tamper > 0.70,
        },
        quality: {
          blur: 0.08,
          glare: 0.06,
          brightness: 0.92,
          score: t.state === 'NEEDS_RESUBMISSION' ? 0.65 : 0.94,
          passed: t.state !== 'NEEDS_RESUBMISSION',
          feedback: t.state === 'NEEDS_RESUBMISSION' ? 'Document image has glare covering the ID number.' : 'Optimal',
        },
      },
      faceVerification: {
        model: 'ArcFace',
        detector: 'RetinaFace',
        similarity: t.similarity,
        distance: Number((1.0 - t.similarity).toFixed(3)),
        threshold: 0.80,
        match: t.similarity >= 0.80,
        confidence: Number((t.similarity * 0.98).toFixed(3)),
        selfieUrl: `/uploads/mock/selfie_${i % 6 + 1}.jpg`,
        croppedFaceUrl: `/uploads/mock/doc_${t.docType}_${t.country}.jpg`,
      },
      liveness: {
        score: t.liveness,
        threshold: 0.85,
        method: 'passive',
        passed: t.liveness >= 0.85,
      },
      riskScore: t.riskScore,
      riskFlags: t.riskFlags,
      decision: ['PROCESSING', 'QUEUED', 'CREATED', 'CONSENTED', 'DOCS_UPLOADED'].includes(t.state)
        ? undefined
        : {
            outcome: t.state as any,
            reasonCodes: t.riskFlags.length > 0 ? t.riskFlags : ['ALL_CHECKS_PASSED'],
            policyVersion: defaultPolicy.version,
            decidedBy: t.state === 'APPROVED' || t.state === 'REJECTED' ? reviewerUser?.email : 'AI_DECISION_ENGINE',
            decidedAt: new Date(createdAt.getTime() + 240000),
            priority: t.riskScore >= 60 ? 80 : 30,
          },
      retention: {
        deleteAfter: new Date(now + 1825 * 24 * 60 * 60 * 1000),
        legalHold: false,
      },
      assignedTo: t.state === 'MANUAL_REVIEW' && (i % 2 === 0) ? reviewerUser?._id : undefined,
      slaDueAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
      createdAt,
    });

    // Seed consent for this case
    const consentText = 'I explicitly consent to biometric processing and facial image comparison for the purpose of identity verification in accordance with applicable AML regulations and privacy policies.';
    const textHash = crypto.createHash('sha256').update(consentText).digest('hex');
    const ipHash = crypto.createHash('sha256').update('192.168.1.100').digest('hex');

    const consent = await Consent.create({
      applicantId: applicant._id,
      caseId: kCase.caseId,
      type: 'biometric',
      policyVersion: 1,
      textHash,
      consentText,
      granted: true,
      signatureName: t.name,
      ipHash,
      userAgentHash: 'sha256_mock_user_agent_chrome',
      at: new Date(createdAt.getTime() + 60000),
    });

    kCase.consentIds = [consent._id as any];
    await kCase.save();

    // If MANUAL_REVIEW, create a ReviewTask
    if (t.state === 'MANUAL_REVIEW') {
      await ReviewTask.create({
        caseId: kCase.caseId,
        status: i % 2 === 0 ? 'CLAIMED' : 'PENDING',
        priority: t.riskScore >= 65 ? 85 : 50,
        claimedBy: i % 2 === 0 ? reviewerUser?._id : undefined,
        claimExpiresAt: i % 2 === 0 ? new Date(now + 25 * 60 * 1000) : undefined,
        reasonCodes: t.riskFlags,
        slaDueAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
        createdAt,
      });
    }

    // Seed ModelRun
    await ModelRun.create({
      runId: `run-seed-${kCase.caseId}`,
      caseId: kCase.caseId,
      stage: 'FACE',
      modelName: 'ArcFace',
      modelVersion: '2.4.0',
      latencyMs: 340,
      inputStats: { blur: 0.08, glare: 0.06 },
      metrics: { similarity: t.similarity, match: t.similarity >= 0.80 },
      timestamp: new Date(createdAt.getTime() + 200000),
    });
  }

  console.log(`[Seed] Seeded ${caseTemplates.length} KYC cases with mixed states.`);

  // 5. Seed DSAR Requests
  await DSARRequest.insertMany([
    {
      requestId: 'DSAR-001092-B7',
      applicantId: createdApplicants[0]._id,
      email: 'asha.patel@example.com',
      type: 'ACCESS',
      status: 'SUBMITTED',
      reason: 'Standard personal data copy request under GDPR Article 15.',
      requestedAt: new Date(now - 3 * 24 * 3600 * 1000),
      slaDueAt: new Date(now + 27 * 24 * 3600 * 1000),
    },
    {
      requestId: 'DSAR-001093-C4',
      applicantId: createdApplicants[3]._id,
      email: 'sofia.rodriguez@example.es',
      type: 'DELETION',
      status: 'IN_REVIEW',
      reason: 'Right to erasure of biometric selfies and identity documents.',
      requestedAt: new Date(now - 6 * 24 * 3600 * 1000),
      slaDueAt: new Date(now + 24 * 24 * 3600 * 1000),
    },
    {
      requestId: 'DSAR-000984-A1',
      applicantId: createdApplicants[4]._id,
      email: 'tariq.mansoor@example.ae',
      type: 'DELETION',
      status: 'COMPLETED',
      reason: 'Verification completed, applicant requested biometric purge.',
      requestedAt: new Date(now - 20 * 24 * 3600 * 1000),
      slaDueAt: new Date(now + 10 * 24 * 3600 * 1000),
      executedAt: new Date(now - 15 * 24 * 3600 * 1000),
      executedBy: createdStaff.find((u) => u.role === 'compliance_officer')?._id,
      completionCertificate: {
        certificateId: 'CERT-ERASURE-99214',
        erasedArtifactCount: 3,
        erasedCaseCount: 1,
        hashProof: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        timestamp: new Date(now - 15 * 24 * 3600 * 1000),
      },
    },
  ]);

  // 6. Seed Daily Analytics (historical 7 days)
  const dailyAnalyticsData = [];
  for (let d = 7; d >= 0; d--) {
    const dayDate = new Date(now - d * 24 * 3600 * 1000);
    const dateStr = dayDate.toISOString().split('T')[0];
    dailyAnalyticsData.push({
      date: dateStr,
      totalCases: 28 + (d * 3),
      autoApproved: 20 + d,
      manualReview: 4 + (d % 2),
      autoRejected: 2,
      needsResubmission: 2,
      approved: 22 + d,
      rejected: 3,
      avgProcessingTimeMs: 1180 + (d * 20),
      medianTimeToDecisionMinutes: 3.1 + (d * 0.1),
      p95TimeToDecisionMinutes: 7.8 + (d * 0.2),
      ocrAvgConfidence: 0.96,
      faceAvgSimilarity: 0.92,
      livenessAvgScore: 0.95,
    });
  }
  await AnalyticsDaily.insertMany(dailyAnalyticsData);

  // 7. Seed Initial Audit Logs with Cryptographic Chain
  await createAuditEntry({
    actor: { type: 'system', role: 'deployment' },
    action: 'SYSTEM_INITIALIZED',
    resource: { type: 'System', id: 'kyc-flow-core' },
    outcome: 'SUCCESS',
    metadata: { version: '1.0.0', environment: 'development' },
  });

  await createAuditEntry({
    actor: { id: reviewerUser?._id?.toString(), type: 'user', role: 'reviewer', email: reviewerUser?.email },
    action: 'POLICY_VERIFIED',
    resource: { type: 'Policy', id: defaultPolicy._id.toString() },
    outcome: 'SUCCESS',
    metadata: { policyVersion: 1 },
  });

  console.log('[Seed] Database seeding completed successfully!');
}

// If run directly via tsx
if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}
