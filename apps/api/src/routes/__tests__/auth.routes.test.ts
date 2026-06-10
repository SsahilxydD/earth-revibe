import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@earth-revibe/db';
import { request, cleanupTestData, createTestUser } from '../../test/helpers';
import { hashOtp, hashPassword } from '../../services/auth.service';

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

/**
 * Seed a fresh, unverified OTP for a phone. The API never returns the code
 * (it goes out via WhatsApp, hashed at rest), so tests write the row directly
 * with a known code's hash — no network involved.
 */
async function seedOtp(phone: string, code = '123456') {
  await prisma.otpCode.create({
    data: {
      phone,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });
  return code;
}

describe('Auth Routes', () => {
  const createdUserIds: string[] = [];
  const usedPhones: string[] = [];

  afterEach(async () => {
    if (usedPhones.length) {
      await prisma.otpCode.deleteMany({ where: { phone: { in: usedPhones } } });
      usedPhones.length = 0;
    }
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  describe('POST /api/v1/auth/send-otp', () => {
    it('should reject an invalid phone (400)', async () => {
      const res = await request
        .post('/api/v1/auth/send-otp')
        .send({ phone: 'not-a-phone' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should log in an existing user with a valid OTP and set auth cookies (200)', async () => {
      const { user } = await createTestUser();
      createdUserIds.push(user.id);
      usedPhones.push(user.phone!);
      const code = await seedOtp(user.phone!);

      const res = await request
        .post('/api/v1/auth/verify-otp')
        .send({ phone: user.phone, code })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(user.id);
      // Tokens are in httpOnly cookies, not in the JSON body
      expect(getCookie(res, 'access_token')).toBeTruthy();
      expect(getCookie(res, 'refresh_token')).toBeTruthy();
    });

    it('should reject a wrong code and count the attempt (400)', async () => {
      const { user } = await createTestUser();
      createdUserIds.push(user.id);
      usedPhones.push(user.phone!);
      await seedOtp(user.phone!, '123456');

      const res = await request
        .post('/api/v1/auth/verify-otp')
        .send({ phone: user.phone, code: '654321' })
        .expect(400);

      expect(res.body.error.message).toBe('Invalid OTP');
      const otp = await prisma.otpCode.findFirst({ where: { phone: user.phone! } });
      expect(otp?.attempts).toBe(1);
    });

    it('should reject when no active OTP exists for the phone (400)', async () => {
      const { user } = await createTestUser();
      createdUserIds.push(user.id);
      usedPhones.push(user.phone!);

      const res = await request
        .post('/api/v1/auth/verify-otp')
        .send({ phone: user.phone, code: '123456' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials and set auth cookies (200)', async () => {
      const password = 'Sturdy-Passw0rd';
      const { user } = await createTestUser();
      createdUserIds.push(user.id);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      });

      const res = await request
        .post('/api/v1/auth/login')
        .send({ email: user.email, password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(user.email);
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
      const { user } = await createTestUser();
      createdUserIds.push(user.id);
      usedPhones.push(user.phone!);
      const code = await seedOtp(user.phone!);
      const loginRes = await request
        .post('/api/v1/auth/verify-otp')
        .send({ phone: user.phone, code });
      const accessToken = getCookie(loginRes, 'access_token');

      const res = await request
        .get('/api/v1/auth/me')
        .set('Cookie', `access_token=${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe(user.email);
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
      const { user } = await createTestUser();
      createdUserIds.push(user.id);
      usedPhones.push(user.phone!);
      const code = await seedOtp(user.phone!);
      const loginRes = await request
        .post('/api/v1/auth/verify-otp')
        .send({ phone: user.phone, code });
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
      const password = 'Sturdy-Passw0rd';
      const { user } = await createTestUser();
      createdUserIds.push(user.id);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      });

      const loginRes = await request
        .post('/api/v1/auth/login')
        .send({ email: user.email, password });
      const accessToken = getCookie(loginRes, 'access_token');

      await request
        .put('/api/v1/auth/password')
        .set('Cookie', `access_token=${accessToken}`)
        .send({
          currentPassword: password,
          newPassword: 'NewPass123',
          confirmNewPassword: 'NewPass123',
        })
        .expect(200);

      await request
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'NewPass123' })
        .expect(200);
    });
  });
});
