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
      ipHash: req.ip || '127.0.0.1',
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
    ipHash: req.ip || '127.0.0.1',
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
  const sessionId = `sess_${crypto.randomBytes(12).toString('hex')}`;
  // For development OTP is always 123456 as specified in requirement 7
  const otpCode = '123456';

  await VerificationSession.create({
    sessionId,
    contactType,
    contactValue: contactValue.toLowerCase(),
    otpCode,
    attempts: 0,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  res.json({
    success: true,
    data: {
      sessionId,
      contactType,
      contactValue,
      devOtp: '123456', // Displayed in development UI
      message: 'OTP sent successfully (Development OTP: 123456)',
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

  if (session.otpCode !== otpCode) {
    session.attempts += 1;
    await session.save();
    res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'Invalid verification code' } });
    return;
  }

  session.verified = true;

  // Find or create applicant
  const hash = crypto.createHash('sha256').update(session.contactValue).digest('hex');
  let applicant = await Applicant.findOne({ emailHash: hash });

  if (!applicant) {
    applicant = await Applicant.create({
      email: session.contactType === 'email' ? session.contactValue : undefined,
      phone: session.contactType === 'phone' ? session.contactValue : undefined,
      emailHash: session.contactType === 'email' ? hash : undefined,
      phoneHash: session.contactType === 'phone' ? hash : undefined,
      status: 'active',
    });
  }

  session.applicantId = applicant._id as any;
  await session.save();

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
      sessionId,
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
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
}
