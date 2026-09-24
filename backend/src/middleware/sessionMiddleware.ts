// FENCO 2.0 — Multi-Judge Anonymous Session Middleware
// Ensures multi-user isolation so multiple judges or visitors
// can evaluate the platform simultaneously without data collision.

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
    }
  }
}

export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check incoming header or generate new isolated session ID
  const incomingSession = req.headers['x-session-id'] as string;
  const sessionId = incomingSession && incomingSession.trim().length > 0
    ? incomingSession.trim()
    : uuidv4();

  req.sessionId = sessionId;

  // Echo session ID back in response headers so frontend client can persist it
  res.setHeader('X-Session-ID', sessionId);
  next();
}
