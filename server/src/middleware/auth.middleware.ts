import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { AuthUserPayload } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;
    const user = await User.findById(decoded.id).select('_id username email role isSuspended');

    if (!user) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      return;
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrative privileges required.' });
    return;
  }
  next();
}
