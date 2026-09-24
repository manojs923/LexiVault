// FENCO 2.0 — Rate Limiting Middleware

import rateLimit from 'express-rate-limit';
import { getEnv } from '../config/env';

export function createRateLimiter() {
  const env = getEnv();
  
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
    skip: (req) => req.path === '/api/health', // Don't rate-limit health checks
  });
}
