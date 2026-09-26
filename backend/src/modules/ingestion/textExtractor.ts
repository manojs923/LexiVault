// FENCO 2.0 / LexiVault — Text Extraction Module
// Extracts text from PDF and plain text files.
// Sanitizes output to remove HTML, control characters, and XSS patterns without ESM conflicts.

import fs from 'fs';
import path from 'path';

const MIN_CONTENT_LENGTH = 50;

/**
 * Extract raw text from a PDF or TXT file.
 */
export async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  let rawText: string;
  
  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(dataBuffer);
    rawText = parsed.text;
  } else if (ext === '.txt') {
    rawText = fs.readFileSync(filePath, 'utf-8');
  } else {
    throw new Error(`Unsupported file type: ${ext}. Only .pdf and .txt are supported.`);
  }
  
  return sanitizeText(rawText);
}

/**
 * Sanitize extracted text:
 * - Strip HTML tags, script/style blocks, and XSS patterns
 * - Remove control characters (except newlines and tabs)
 * - Normalize whitespace
 * - Enforce minimum length
 */
export function sanitizeText(text: string): string {
  // Strip script and style blocks entirely
  let cleaned = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Strip all other HTML/XML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  
  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Remove control characters except \n, \r, \t
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize multiple spaces to single space (but preserve newlines)
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  // Normalize multiple newlines to max 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Trim
  cleaned = cleaned.trim();
  
  if (cleaned.length < MIN_CONTENT_LENGTH) {
    throw new Error(`Document content too short (${cleaned.length} chars). Minimum is ${MIN_CONTENT_LENGTH} characters.`);
  }
  
  return cleaned;
}
