import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const OtpRequestSchema = z.object({
  contactType: z.enum(['email', 'phone']),
  contactValue: z.string().min(3),
});

export const OtpVerifySchema = z.object({
  sessionId: z.string(),
  otpCode: z.string().length(6),
});

export const ConsentSchema = z.object({
  applicantId: z.string(),
  caseId: z.string().optional(),
  type: z.enum(['biometric', 'general', 'marketing']).default('biometric'),
  policyVersion: z.number().default(1),
  granted: z.boolean(),
  signatureName: z.string().min(2),
  consentText: z.string(),
});

export const CreateCaseSchema = z.object({
  applicantId: z.string(),
  country: z.string().default('IN'),
  documentType: z.enum(['passport', 'national_id', 'driver_license']).default('passport'),
  jurisdiction: z.string().default('IN'),
  riskTier: z.enum(['low', 'standard', 'high']).default('standard'),
});

export const ReviewDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'RESUBMIT', 'ESCALATE']),
  reasonCodes: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const RevealPiiSchema = z.object({
  justification: z.string().min(10, 'Justification must be at least 10 characters long explaining audit reason'),
});

export const OverrideSchema = z.object({
  targetOutcome: z.enum(['APPROVED', 'REJECTED']),
  justification: z.string().min(10, 'Justification must be at least 10 characters long'),
});

export const DSARCreateSchema = z.object({
  email: z.string().email(),
  type: z.enum(['ACCESS', 'DELETION', 'CORRECTION']),
  reason: z.string().optional(),
});

export const PolicyUpdateSchema = z.object({
  faceMatchThreshold: z.number().min(0).max(1).optional(),
  livenessThreshold: z.number().min(0).max(1).optional(),
  tamperThreshold: z.number().min(0).max(1).optional(),
  ocrConfidenceThreshold: z.number().min(0).max(1).optional(),
  autoApproveAllowed: z.boolean().optional(),
  activeLivenessRequired: z.boolean().optional(),
  retentionDaysBiometric: z.number().min(1).optional(),
  retentionDaysId: z.number().min(1).optional(),
});
