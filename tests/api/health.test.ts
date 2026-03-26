import { describe, it, expect } from 'vitest';
import request from 'supertest';

/**
 * API integration tests that hit the live production API.
 * These test real HTTP responses — not mocks.
 *
 * Uses the deployed API URL (same as storefront uses).
 */

const API_URL = process.env.API_TEST_URL || 'https://earth-revibeapi-production.up.railway.app';

describe('Health Check', () => {
  it('GET /api/v1/health returns 200', async () => {
    const res = await request(API_URL).get('/api/v1/health').timeout(10000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('running');
    expect(res.body.checks.database).toBe('ok');
  });
});
