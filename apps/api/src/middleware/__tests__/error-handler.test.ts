import { describe, it, expect } from 'vitest';
import { request } from '../../test/helpers';

describe('errorHandler middleware', () => {
  it('should return structured error for ApiError (401 on bad login)', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'noone@test.com', password: 'Fake1234' })
      .expect(401);

    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      },
    });
  });

  it('should return structured error for validation failures (400)', async () => {
    const res = await request.post('/api/v1/auth/register').send({ email: 'bad' }).expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.details).toBeDefined();
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request.get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
  });
});
