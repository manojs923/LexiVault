// FENCO 2.0 — Upload Routes

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query } from '../db/connection';
import { runIngestionPipeline } from '../modules/ingestion/ingestionPipeline';
import { createError } from '../middleware/errorHandler';
import { getEnv } from '../config/env';
import { truncateForLog } from '../utils/index';
import { LEGAL_DISCLAIMER } from '../types/index';

const router = Router();
const env = getEnv();

// Ensure upload directory exists immediately on module load
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = ['.pdf', '.txt'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain', 'application/octet-stream', 'text/markdown'];

// Multer config: UUID-prefixed filenames, MIME + extension validation
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve(env.UPLOAD_DIR);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      cb(createError(`Invalid file format (${ext || 'unspecified'}). Only PDF and TXT files are accepted.`, 400));
      return;
    }
    cb(null, true);
  },
});

const uploadBodySchema = z.object({
  documentType: z.enum(['freelance', 'residential_lease', 'other']).default('other'),
});

// POST /api/documents/upload
router.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(createError('No file uploaded', 400));
      }
      
      const body = uploadBodySchema.safeParse(req.body);
      const documentType = body.success ? body.data.documentType : 'other';
      
      // Create document record
      let result;
      try {
        result = await query<{ id: string }>(
          `INSERT INTO documents (filename, original_name, document_type, status)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [req.file.filename, truncateForLog(req.file.originalname, 255), documentType, 'uploaded']
        );
      } catch (dbErr: any) {
        console.error('[Upload] Database insert failed:', dbErr);
        return next(createError(`Database error: ${dbErr.message || 'Failed to save document. Ensure PostgreSQL is running.'}`, 500));
      }
      
      const documentId = result.rows[0].id;
      
      // Run ingestion in background (don't await — return immediately)
      runIngestionPipeline(documentId, req.file.path, documentType)
        .catch(err => console.error(`[Upload] Ingestion failed for ${documentId}:`, truncateForLog(String(err))));
      
      res.json({
        documentId,
        status: 'uploaded',
        message: 'File uploaded. Ingestion started.',
        disclaimer: LEGAL_DISCLAIMER,
        sessionId: req.sessionId,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/documents/:id/status
router.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query<{
      id: string;
      status: string;
      filename: string;
      original_name: string;
      document_type: string;
      error_message: string | null;
      reduced_accuracy_mode: boolean;
    }>(
      `SELECT id, status, filename, original_name, document_type, error_message, reduced_accuracy_mode
       FROM documents WHERE id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return next(createError('Document not found', 404));
    }
    
    const doc = result.rows[0];
    res.json({
      documentId: doc.id,
      status: doc.status,
      filename: doc.original_name,
      documentType: doc.document_type,
      errorMessage: doc.error_message,
      reducedAccuracyMode: doc.reduced_accuracy_mode,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
