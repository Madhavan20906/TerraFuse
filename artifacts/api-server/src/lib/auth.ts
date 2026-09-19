import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface AuthenticatedUser {
  id: string;
  role: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check header or cookie
  let userId = (req.headers['x-user-id'] as string) || (req.cookies?.['tf_user_id'] as string);

  if (!userId) {
    userId = `usr-${randomUUID().slice(0, 8)}`;
    // Set cookie for browser sessions
    res.cookie('tf_user_id', userId, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  req.user = {
    id: userId,
    role: 'procurement-reviewer',
    name: 'Reviewer',
  };

  next();
}
