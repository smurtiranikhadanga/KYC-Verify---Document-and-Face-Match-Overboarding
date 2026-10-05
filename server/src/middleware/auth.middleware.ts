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
      if (!applicant || applicant.status === 'erased') {
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

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    req.role = decoded.role;
    next();
  } catch {
    next();
  }
}
