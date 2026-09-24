// FENCO 2.0 — Integration Tests: Document Grounded Q&A (§7B)

import request from 'supertest';
import app from '../../src/server';
import { query } from '../../src/db/connection';
import { v4 as uuidv4 } from 'uuid';

describe('Document Grounded Q&A (§7B)', () => {
  let docId: string;

  beforeAll(async () => {
    // Insert mock analyzed document
    const docRes = await query<{ id: string }>(
      `INSERT INTO documents (filename, original_name, document_type, status)
       VALUES ('test-qa.txt', 'test-qa.txt', 'freelance', 'analyzed')
       RETURNING id`
    );
    docId = docRes.rows[0].id;

    // Insert mock clause
    await query(
      `INSERT INTO clauses (document_id, clause_index, clause_type, text, text_hash, embedding)
       VALUES ($1, 1, 'Payment Terms', 'Payment must be made within 15 days via wire transfer.', 'hash1',
               array_fill(0.05, ARRAY[3072])::vector)`,
      [docId]
    );
  });

  afterAll(async () => {
    if (docId) {
      await query('DELETE FROM documents WHERE id = $1', [docId]);
    }
  });

  it('rejects questions that are too short', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/ask`)
      .send({ question: 'Hi' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 5 characters/i);
  });

  it('returns 404 if document does not exist', async () => {
    const fakeId = uuidv4();
    const res = await request(app)
      .post(`/api/documents/${fakeId}/ask`)
      .send({ question: 'What are the payment terms?' });

    expect(res.status).toBe(500);
  });
});
