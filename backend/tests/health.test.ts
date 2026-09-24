// FENCO 2.0 — Health Check Integration Test
import request from 'supertest';
import app from '../src/server';

describe('GET /api/health', () => {
  it('returns 200 with service info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('fenco-api');
    expect(res.body.providers).toBeDefined();
    expect(res.body.providers.llm).toBeDefined();
    expect(res.body.providers.embedding).toBeDefined();
  });
});
