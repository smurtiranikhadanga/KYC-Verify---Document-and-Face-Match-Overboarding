import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/user.model.js';
import { Applicant } from '../models/applicant.model.js';
import { VerificationSession } from '../models/session.model.js';
import { createAuditEntry } from '../models/audit-log.model.js';
import { LoginSchema, OtpRequestSchema, OtpVerifySchema } from '../validators/index.js';
import { ENV } from '../config/env.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

// FIX AUTH-01: OTP attempt cap constants
const OTP_MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.format() } });
    return;
  }

  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user || !(await user.comparePassword(password))) {
    await createAuditEntry({
      actor: { type: 'user', email },
      action: 'LOGIN_FAILED',
      resource: { type: 'User', id: email },
      outcome: 'DENIED',
      ipHash: crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex'),
      metadata: { reason: 'Invalid credentials' },
    });

    res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ success: false, error: { code: 'ACCOUNT_DEACTIVATED', message: 'User account is deactivated' } });
    return;
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email, name: user.name },
    ENV.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  await createAuditEntry({
    actor: { id: user._id.toString(), type: 'user', role: user.role, email: user.email },
    action: 'LOGIN',
    resource: { type: 'User', id: user._id.toString() },
    outcome: 'SUCCESS',
    ipHash: crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex'),
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        region: user.region,
      },
    },
  });
}

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const parsed = OtpRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.format() } });
    return;
  }

  const { contactType, contactValue } = parsed.data;
  const contactNormal = contactValue.toLowerCase().trim();

  // FIX N-13c: Per-contact rate limit (prevent inbox spam across multiple IPs)
  const recentRequests = await VerificationSession.countDocuments({
    contactValue: contactNormal,
    createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
  });
  if (recentRequests >= 5) {
    res.status(429).json({ success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests for this contact. Try again in 15 minutes.' } });
    return;
  }

  // FIX AUTH-01 & N-13c: Generate a real random 6-digit OTP, properly padded (use '123456' in test mode)
  const otpCode = process.env.NODE_ENV === 'test'
    ? '123456'
    : crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;

  await VerificationSession.create({
    sessionId,
    contactType,
    contactValue: contactNormal,
    otpCode,
    attempts: 0,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  });

  // For development: log to server console and provide devOtp in response
  if (ENV.NODE_ENV !== 'production') {
    console.log(`[DEV OTP] session=${sessionId} otp=${otpCode}`);
  }

  res.json({
    success: true,
    data: {
      sessionId,
      contactType,
      devOtp: ENV.NODE_ENV !== 'production' ? otpCode : undefined,
      message: `Verification code sent to your ${contactType}`,
    },
  });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const parsed = OtpVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.format() } });
    return;
  }

  const { sessionId, otpCode } = parsed.data;
  const session = await VerificationSession.findOne({ sessionId });

  if (!session) {
    res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Verification session expired or invalid' } });
    return;
  }

  // FIX AUTH-01: Explicit expiry check
  if (new Date() > session.expiresAt) {
    await VerificationSession.deleteOne({ sessionId });
    res.status(400).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'Verification code has expired. Please request a new one.' } });
    return;
  }

  // FIX AUTH-01: Attempt cap enforced
  if (session.attempts >= OTP_MAX_ATTEMPTS) {
    await VerificationSession.deleteOne({ sessionId });
    res.status(429).json({ success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Maximum verification attempts exceeded. Please request a new code.' } });
    return;
  }

  // Verification code check:
  // In development, accept either the generated OTP or fallback 123456.
  // In production, strictly enforce constant-time check against generated OTP.
  let isValid = false;
  try {
    isValid = crypto.timingSafeEqual(
      Buffer.from(session.otpCode.padStart(6, '0')),
      Buffer.from(otpCode.padStart(6, '0'))
    );
  } catch {
    isValid = false;
  }

  if (!isValid && ENV.NODE_ENV !== 'production' && otpCode === '123456') {
    isValid = true;
  }

  if (!isValid) {
    session.attempts += 1;
    await session.save();
    const remaining = OTP_MAX_ATTEMPTS - session.attempts;
    res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: `Invalid verification code. ${remaining} attempt(s) remaining.` } });
    return;
  }

  // FIX AUTH-01: Mark session as verified and delete it (non-reusable)
  await VerificationSession.deleteOne({ sessionId });

  // FIX AUTH-06: Use the correct hash field depending on contactType
  const hash = crypto.createHash('sha256').update(session.contactValue).digest('hex');

  let applicant;
  if (session.contactType === 'email') {
    applicant = await Applicant.findOne({ emailHash: hash });
  } else {
    applicant = await Applicant.findOne({ phoneHash: hash });
  }

  if (!applicant) {
    applicant = await Applicant.create({
      email: session.contactType === 'email' ? session.contactValue : undefined,
      phone: session.contactType === 'phone' ? session.contactValue : undefined,
      emailHash: session.contactType === 'email' ? hash : undefined,
      phoneHash: session.contactType === 'phone' ? hash : undefined,
      status: 'active',
    });
  }

  // FIX AUTH-06: Block suspended applicants from getting a token
  if (applicant.status === 'suspended') {
    res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'This account has been suspended.' } });
    return;
  }

  const token = jwt.sign(
    { id: applicant._id, role: 'applicant', contact: session.contactValue },
    ENV.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    data: {
      token,
      applicantId: applicant._id,
      currentCaseId: applicant.currentCaseId,
    },
  });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (req.user) {
    res.json({
      success: true,
      data: {
        type: 'staff',
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        department: req.user.department,
        region: req.user.region,
        jurisdictions: req.user.jurisdictions,
      },
    });
    return;
  }

  if (req.applicant) {
    res.json({
      success: true,
      data: {
        type: 'applicant',
        role: 'applicant',
        id: req.applicant._id,
        email: req.applicant.email,
        phone: req.applicant.phone,
        status: req.applicant.status,
        currentCaseId: req.applicant.currentCaseId,
      },
    });
    return;
  }

  res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  // FIX AUTH-04: clear cookie on logout
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.json({ success: true, message: 'Logged out successfully' });
}
