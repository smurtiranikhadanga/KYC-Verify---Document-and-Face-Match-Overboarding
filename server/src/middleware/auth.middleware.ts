import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User, IUser } from '../models/user.model.js';
import { Applicant } from '../models/applicant.model.js';

export interface AuthRequest extends Request {
  user?: IUser;
  applicant?: any;
  role?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication token required' },
      });
      return;
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;

    if (decoded.role === 'applicant') {
      const applicant = await Applicant.findById(decoded.id);
      // FIX AUTH-02: check suspended status too, not just 'erased'
      if (!applicant || applicant.status === 'erased' || applicant.status === 'suspended') {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Applicant account no longer active' },
        });
        return;
      }
      req.applicant = applicant;
      req.role = 'applicant';
      next();
      return;
    }

    // Staff user
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User account invalid or deactivated' },
      });
      return;
    }

    req.user = user;
    req.role = user.role;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    });
  }
}

/**
 * FIX AUTH-02: optionalAuth now fully decodes both user and applicant,
 * not just setting req.role. This ensures ownership checks in getCaseById work.
 */
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    req.role = decoded.role;

    if (decoded.role === 'applicant') {
      const applicant = await Applicant.findById(decoded.id);
      if (applicant && applicant.status !== 'erased' && applicant.status !== 'suspended') {
        req.applicant = applicant;
      }
    } else {
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
        req.role = user.role;
      }
    }
    next();
  } catch {
    next();
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.role || !roles.includes(req.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
      return;
    }
    next();
  };
}
