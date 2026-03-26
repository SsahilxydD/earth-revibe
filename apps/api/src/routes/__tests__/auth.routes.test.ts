import { describe, it, expect, afterEach } from 'vitest';
import {
  request,
  cleanupTestData,
  makeRegisterPayload,
  isSupabaseConfigured,
} from '../../test/helpers';

const describeIf = isSupabaseConfigured() ? describe : describe.skip;

describeIf('Auth Routes', () => {
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
      expect(res.body.data.user.email).toBe(payload.email);
      expect(res.body.data.accessToken).toBeDefined();
      createdUserIds.push(res.body.data.user.id);
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
      createdUserIds.push(first.body.data.user.id);

      const res = await request.post('/api/v1/auth/register').send(payload).expect(409);

      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials (200)', async () => {
      const payload = makeRegisterPayload();
      const registerRes = await request.post('/api/v1/auth/register').send(payload);
      createdUserIds.push(registerRes.body.data.user.id);

      const res = await request
        .post('/api/v1/auth/login')
        .send({ email: payload.email, password: payload.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(payload.email);
      expect(res.body.data.accessToken).toBeDefined();
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
      const { accessToken } = registerRes.body.data;
      createdUserIds.push(registerRes.body.data.user.id);

      const res = await request
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe(payload.email);
    });

    it('should reject missing token (401)', async () => {
      await request.get('/api/v1/auth/me').expect(401);
    });

    it('should reject invalid token (401)', async () => {
      await request.get('/api/v1/auth/me').set('Authorization', 'Bearer invalid-token').expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return new tokens (200)', async () => {
      const payload = makeRegisterPayload();
      const registerRes = await request.post('/api/v1/auth/register').send(payload);
      createdUserIds.push(registerRes.body.data.user.id);

      const loginRes = await request
        .post('/api/v1/auth/login')
        .send({ email: payload.email, password: payload.password });

      const res = await request
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginRes.body.data.refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });
  });

  describe('PUT /api/v1/auth/password', () => {
    it('should change password with valid current password (200)', async () => {
      const payload = makeRegisterPayload();
      const registerRes = await request.post('/api/v1/auth/register').send(payload);
      const { accessToken } = registerRes.body.data;
      createdUserIds.push(registerRes.body.data.user.id);

      await request
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
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
