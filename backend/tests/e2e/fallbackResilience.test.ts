// FENCO 2.0 — E2E Tests: Forced Fallback Embedding & Reduced Accuracy Mode (§7.4)

import { query } from '../../src/db/connection';
import request from 'supertest';
import app from '../../src/server';
import { generateFallbackEmbedding } from '../../src/utils/index';

describe('Resilience & Reduced Accuracy Mode (§7.4)', () => {
  let docId: string;

  beforeAll(async () => {
    // Insert document that used fallback embedding
    const docRes = await query<{ id: string }>(
      `INSERT INTO documents (filename, original_name, document_type, status, reduced_accuracy_mode)
       VALUES ('fallback-doc.txt', 'fallback-doc.txt', 'freelance', 'analyzed', true)
       RETURNING id`
    );
    docId = docRes.rows[0].id;

    const fallbackVec = generateFallbackEmbedding('Test fallback clause', 3072);

    await query(
      `INSERT INTO clauses (
        document_id, clause_index, clause_type, text, text_hash, embedding,
        risk_level, confidence_score, used_fallback_embedding, semantic_delta_explanation, stage1_only
       ) VALUES ($1, 1, 'Indemnification', 'Contractor indemnifies client fully.', 'hash_fb',
                $2::vector, 'Unfavorable', 0.25, true, 'Analyzed with fallback vector.', false)`,
      [docId, `[${fallbackVec.join(',')}]`]
    );
  });

  afterAll(async () => {
    if (docId) {
      await query('DELETE FROM documents WHERE id = $1', [docId]);
    }
  });

  it('marks document status as reduced_accuracy_mode=true in API status endpoint', async () => {
    const res = await request(app).get(`/api/documents/${docId}/status`);

    expect(res.status).toBe(200);
    expect(res.body.reducedAccuracyMode).toBe(true);
  });

  it('preserves reducedAccuracyMode flag in full analysis payload', async () => {
    const res = await request(app).get(`/api/documents/${docId}/analysis`);

    expect(res.status).toBe(200);
    expect(res.body.reducedAccuracyMode).toBe(true);
    expect(res.body.clauses[0].usedFallbackEmbedding).toBe(true);
    expect(res.body.clauses[0].confidenceScore).toBeLessThan(0.40);
    expect(res.body.disclaimer).toBeDefined();
  });
});
