// FENCO 2.0 — Integration Tests: Document Upload & MIME Enforcement

import request from 'supertest';
import app from '../../src/server';
import path from 'path';
import fs from 'fs';

describe('POST /api/documents/upload', () => {
  const tempDir = path.resolve('./uploads/test_temp');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects upload when no file is provided', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .field('documentType', 'freelance');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file uploaded/i);
  });

  it('rejects unsupported file formats (e.g. .exe, .json)', async () => {
    const fakeExePath = path.join(tempDir, 'malicious.exe');
    fs.writeFileSync(fakeExePath, 'binary executable content');

    const res = await request(app)
      .post('/api/documents/upload')
      .attach('file', fakeExePath);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only pdf and txt files/i);
  });

  it('accepts valid .txt contract and returns documentId with legal disclaimer', async () => {
    const validTxtPath = path.join(tempDir, 'valid_contract.txt');
    fs.writeFileSync(
      validTxtPath,
      '1. PAYMENT TERMS\nClient agrees to pay Contractor $1000 within thirty days of invoice.\n\n2. TERMINATION\nEither party may terminate upon notice.'
    );

    const res = await request(app)
      .post('/api/documents/upload')
      .field('documentType', 'freelance')
      .attach('file', validTxtPath);

    expect(res.status).toBe(200);
    expect(res.body.documentId).toBeDefined();
    expect(res.body.status).toBe('uploaded');
    expect(res.body.disclaimer).toBeDefined();
    expect(res.body.disclaimer).toMatch(/not constitute legal advice/i);
  });
});
