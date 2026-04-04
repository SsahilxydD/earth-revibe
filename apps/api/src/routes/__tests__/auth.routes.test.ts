import { describe, it, expect, afterEach } from 'vitest';
import { request, cleanupTestData, makeRegisterPayload } from '../../test/helpers';

/** Extract a named cookie value from a supertest response. */
function getCookie(res: { headers: Record<string, string | string[]> }, name: string): string {
  const raw = res.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const c of cookies) {
    if (c.startsWith(`${name}=`)) {
      return c.split(';')[0].split('=').slice(1).join('=');
    }
  }
  return '';
}

describe('Auth Routes', () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user (201)', async () => {
      const payload = makeRegisterPayload();

      const res = await request.post('/api/v1/auth/register').send(payload).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(payload.email);
      // Tokens are in httpOnly cookies, not in the JSON body
      expect(getCookie(res, 'access_token')).toBeTruthy();
      expect(getCookie(res, 'refresh_token')).toBeTruthy();
      createdUserIds.push(res.body.data.id);
    });

    it('should reject invalid email (400)', async () => {
      const payload = makeRegisterPayload({ email: 'not-an-email' });

      const res = await request.post('/api/v1/auth/register').send(payload).expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject weak password (400)', async () => {
      const payload = makeRegisterPayload({ password: '123' });

      const res = await request.post('/api/v1/auth/register').send(payload).expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate email (409)', async () => {
      const payload = makeRegisterPayload();

      const first = await request.post('/api/v1/auth/register').send(payload);
      createdUserIds.push(first.body.data.id);

      const res = await request.post('/api/v1/auth/register').send(payload).expect(409);

      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials and set auth cookies (200)', async () => {
      const payload = makeRegisterPayload();
      const registerRes = await request.post('/api/v1/auth/register').send(payload);
      createdUserIds.push(registerRes.body.data.id);

      const res = await request
        .post('/api/v1/auth/login')
        .send({ email: payload.email, password: payload.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(payload.email);
      // Tokens live in httpOnly cookies
      expect(getCookie(res, 'access_token')).toBeTruthy();
      expect(getCookie(res, 'refresh_token')).toBeTruthy();
    });

    it('should reject invalid credentials (401)', async () => {
      const res = await request
        .post('/api/v1/auth/login')
        .send({ email: 'fake@test.com', password: 'Wrong1234' })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile with valid token (200)', async () => {
      const payload = makeRegisterPayload();
      const registerRes = await request.post('/api/v1/auth/register').send(payload);
      const accessToken = getCookie(registerRes, 'access_token');
      createdUserIds.push(registerRes.body.data.id);

      const res = await request
        .get('/api/v1/auth/me')
        .set('Cookie', `access_token=${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe(payload.email);
    });

    it('should reject missing token (401)', async () => {
      await request.get('/api/v1/auth/me').expect(401);
    });

    it('should reject invalid token (401)', async () => {
      await request.get('/api/v1/auth/me').set('Cookie', 'access_token=invalid-token').expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate tokens via refresh cookie (200)', async () => {
      const payload = makeRegisterPayload();
      const registerRes = await request.post('/api/v1/auth/register').send(payload);
      createdUserIds.push(registerRes.body.data.id);

      const loginRes = await request
        .post('/api/v1/auth/login')
        .send({ email: payload.email, password: payload.password });

      const refreshToken = getCookie(loginRes, 'refresh_token');

      const res = await request
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // New cookies issued
      expect(getCookie(res, 'access_token')).toBeTruthy();
      expect(getCookie(res, 'refresh_token')).toBeTruthy();
      // Old refresh token should no longer work (rotation)
      await request
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(401);
    });
  });

  describe('PUT /api/v1/auth/password', () => {
    it('should change password with valid current password (200)', async () => {
      const payload = makeRegisterPayload();
      const registerRes = await request.post('/api/v1/auth/register').send(payload);
      const accessToken = getCookie(registerRes, 'access_token');
      createdUserIds.push(registerRes.body.data.id);

      await request
        .put('/api/v1/auth/password')
        .set('Cookie', `access_token=${accessToken}`)
        .send({
          currentPassword: payload.password,
          newPassword: 'NewPass123',
          confirmNewPassword: 'NewPass123',
        })
        .expect(200);

      await request
        .post('/api/v1/auth/login')
        .send({ email: payload.email, password: 'NewPass123' })
        .expect(200);
    });
  });
});
