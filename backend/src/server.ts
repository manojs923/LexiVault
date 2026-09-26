// LexiVault — Express Server Entry Point
// Provider: Google Gemini (via @google/genai)
// Last verified: 2026-09-24

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { getEnv } from './config/env';
import { createRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import uploadRouter from './routes/upload';
import analysisRouter from './routes/analysis';
import qaRouter from './routes/qa';
import comparisonRouter from './routes/comparison';
import checklistRouter from './routes/checklist';

import { sessionMiddleware } from './middleware/sessionMiddleware';

const env = getEnv();
const app = express();

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow frontend to load
}));

app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Session-ID'],
  exposedHeaders: ['X-Session-ID'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());
app.use(sessionMiddleware);

// Rate limiting on all API routes
app.use('/api/', createRateLimiter());

// Health check (no auth, no rate limit bypass needed — just fast)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'lexivault-api',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    providers: {
      llm: env.LLM_PRIMARY_MODEL,
      embedding: env.EMBEDDING_PRIMARY_MODEL,
    },
  });
});

// API routes
app.use('/api/documents', uploadRouter);
app.use('/api/documents', analysisRouter);
app.use('/api/documents', qaRouter);
app.use('/api/comparisons', comparisonRouter);
app.use('/api', checklistRouter);

// 404 and error handlers
app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 LexiVault API running on port ${env.PORT}`);
    console.log(`📋 Environment: ${env.NODE_ENV}`);
    console.log(`🤖 Primary LLM: ${env.LLM_PRIMARY_MODEL}`);
    console.log(`🔢 Embedding model: ${env.EMBEDDING_PRIMARY_MODEL} (${env.EMBEDDING_DIMENSIONS} dims)`);
  });

  const shutdown = () => {
    console.log('\n🛑 Gracefully shutting down LexiVault API...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export default app;
