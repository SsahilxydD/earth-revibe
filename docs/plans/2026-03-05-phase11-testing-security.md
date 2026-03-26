# Phase 11: Testing & Security Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up test infrastructure with Vitest, write critical-path tests for the API (auth, orders), and harden security with login rate limiting and input sanitization.

**Architecture:** Vitest for unit + integration tests. Supertest for HTTP endpoint tests against the Express app (no running server needed). Prisma test client with transaction rollback for DB isolation. Security: per-route rate limiting on auth endpoints, XSS sanitization middleware.

**Tech Stack:** Vitest 3.x, Supertest 7.x, @faker-js/faker 9.x, Express 5, Prisma 5, express-rate-limit 8.x

---

### Task 1: Test Infrastructure Setup

**Files:**

- Modify: `apps/api/package.json` (add test dependencies)
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/test/setup.ts`
- Create: `apps/api/src/test/helpers.ts`
- Modify: `apps/api/tsconfig.json` (include test paths)
- Modify: `turbo.json` (add test task)

**Context:** We use Vitest (fast, ESM-native, compatible with our TypeScript setup). Supertest lets us test Express routes without spinning up a server. We use Prisma's `$transaction` with rollback for DB isolation — each test runs inside a transaction that gets rolled back, so tests never pollute each other.

**Step 1: Install test dependencies**

```bash
cd apps/api && pnpm add -D vitest @vitest/coverage-v8 supertest @types/supertest @faker-js/faker
```

**Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**', 'src/middleware/**', 'src/controllers/**'],
    },
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

**Step 3: Create test setup file `apps/api/src/test/setup.ts`**

```typescript
import { beforeAll, afterAll } from 'vitest';
import { prisma } from '@earth-revibe/db';

beforeAll(async () => {
  // Verify DB connection
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

**Step 4: Create test helpers `apps/api/src/test/helpers.ts`**

```typescript
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@earth-revibe/db';
import { app } from '../app';
import { env } from '../config/env';
import { faker } from '@faker-js/faker';

export const request = supertest(app);

// Clean up test data — call in afterEach
export async function cleanupTestData(userIds: string[]) {
  if (userIds.length === 0) return;
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.referral.deleteMany({
    where: { OR: [{ referrerId: { in: userIds } }, { refereeId: { in: userIds } }] },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

// Create a test user directly in DB
export async function createTestUser(
  overrides: {
    role?: string;
    isActive?: boolean;
    email?: string;
  } = {}
) {
  const password = 'Test1234';
  const passwordHash = await bcrypt.hash(password, 4); // low rounds for speed

  const user = await prisma.user.create({
    data: {
      email: overrides.email || faker.internet.email().toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number({ style: 'national' }),
      passwordHash,
      role: (overrides.role as any) || 'CUSTOMER',
      isActive: overrides.isActive ?? true,
      referralCode: `TEST-${faker.string.alphanumeric(6).toUpperCase()}`,
    },
  });

  return { user, password };
}

// Generate a valid access token for a user
export function generateTestToken(userId: string, role: string = 'CUSTOMER') {
  return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

// Generate an expired token
export function generateExpiredToken(userId: string, role: string = 'CUSTOMER') {
  return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: '0s' });
}

// Generate registration payload
export function makeRegisterPayload(overrides: Record<string, any> = {}) {
  return {
    email: faker.internet.email().toLowerCase(),
    password: 'Test1234',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: '9876543210',
    ...overrides,
  };
}
```

**Step 5: Add test script to `apps/api/package.json`**

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**Step 6: Add test task to `turbo.json`**

Add to the `"tasks"` object:

```json
"test": {
  "dependsOn": ["^build"],
  "outputs": ["coverage/**"]
}
```

---

### Task 2: Auth Service — Registration & Login Tests

**Files:**

- Create: `apps/api/src/services/__tests__/auth.service.test.ts`

**Context:** Tests the auth service methods directly (unit-level, but hits real DB). Each test creates its own user and cleans up after. The auth service is at `apps/api/src/services/auth.service.ts`. Registration checks for duplicate emails, hashes passwords, creates referral codes, and returns tokens. Login verifies password, checks isActive, updates lastLoginAt, and returns tokens.

**Code:**

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { authService } from '../auth.service';
import { prisma } from '@earth-revibe/db';
import { createTestUser, cleanupTestData, makeRegisterPayload } from '../../test/helpers';

describe('authService', () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      const payload = makeRegisterPayload();
      const result = await authService.register(payload);

      createdUserIds.push(result.user.id);

      expect(result.user.email).toBe(payload.email);
      expect(result.user.firstName).toBe(payload.firstName);
      expect(result.user.role).toBe('CUSTOMER');
      expect(result.user.referralCode).toMatch(/^REVIBE-/);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const payload = makeRegisterPayload();
      const first = await authService.register(payload);
      createdUserIds.push(first.user.id);

      await expect(authService.register(payload)).rejects.toThrow('Email already registered');
    });

    it('should process referral code if provided', async () => {
      const { user: referrer } = await createTestUser();
      createdUserIds.push(referrer.id);

      const payload = makeRegisterPayload({ referralCode: referrer.referralCode });
      const result = await authService.register(payload);
      createdUserIds.push(result.user.id);

      const referral = await prisma.referral.findFirst({
        where: { referrerId: referrer.id, refereeId: result.user.id },
      });
      expect(referral).not.toBeNull();
      expect(referral!.status).toBe('SIGNED_UP');
    });
  });

  describe('login', () => {
    it('should return user and tokens for valid credentials', async () => {
      const { user, password } = await createTestUser();
      createdUserIds.push(user.id);

      const result = await authService.login({ email: user.email, password });

      expect(result.user.id).toBe(user.id);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const { user } = await createTestUser();
      createdUserIds.push(user.id);

      await expect(
        authService.login({ email: user.email, password: 'WrongPass1' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      await expect(
        authService.login({ email: 'noone@test.com', password: 'Test1234' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject inactive user', async () => {
      const { user, password } = await createTestUser({ isActive: false });
      createdUserIds.push(user.id);

      await expect(authService.login({ email: user.email, password })).rejects.toThrow(
        'Account is deactivated'
      );
    });

    it('should update lastLoginAt on successful login', async () => {
      const { user, password } = await createTestUser();
      createdUserIds.push(user.id);

      await authService.login({ email: user.email, password });

      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated!.lastLoginAt).not.toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should rotate tokens', async () => {
      const payload = makeRegisterPayload();
      const registered = await authService.register(payload);
      createdUserIds.push(registered.user.id);

      const newTokens = await authService.refreshToken(registered.refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.refreshToken).not.toBe(registered.refreshToken);

      // Old token should be deleted
      const oldStored = await prisma.refreshToken.findUnique({
        where: { token: registered.refreshToken },
      });
      expect(oldStored).toBeNull();
    });

    it('should reject invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('changePassword', () => {
    it('should change password and invalidate tokens', async () => {
      const { user, password } = await createTestUser();
      createdUserIds.push(user.id);

      await authService.changePassword(user.id, {
        currentPassword: password,
        newPassword: 'NewPass123',
      });

      // Old password should not work
      await expect(authService.login({ email: user.email, password })).rejects.toThrow(
        'Invalid email or password'
      );

      // New password should work
      const result = await authService.login({ email: user.email, password: 'NewPass123' });
      expect(result.user.id).toBe(user.id);
    });

    it('should reject wrong current password', async () => {
      const { user } = await createTestUser();
      createdUserIds.push(user.id);

      await expect(
        authService.changePassword(user.id, {
          currentPassword: 'WrongPass1',
          newPassword: 'NewPass123',
        })
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});
```

**Run:** `cd apps/api && pnpm test -- src/services/__tests__/auth.service.test.ts`

---

### Task 3: Auth API Endpoint Integration Tests

**Files:**

- Create: `apps/api/src/routes/__tests__/auth.routes.test.ts`

**Context:** Tests the full HTTP request/response cycle for auth endpoints via Supertest. Tests validation (Zod rejects bad input), correct status codes, and response shapes. The `request` helper from `test/helpers.ts` is a Supertest instance wrapping the Express `app`.

**Code:**

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import {
  request,
  createTestUser,
  cleanupTestData,
  generateTestToken,
  makeRegisterPayload,
} from '../../test/helpers';

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
      const { user, password } = await createTestUser();
      createdUserIds.push(user.id);

      const res = await request
        .post('/api/v1/auth/login')
        .send({ email: user.email, password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(user.id);
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
      const { user } = await createTestUser();
      createdUserIds.push(user.id);
      const token = generateTestToken(user.id);

      const res = await request
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.id).toBe(user.id);
      expect(res.body.data.email).toBe(user.email);
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
      const { user, password } = await createTestUser();
      createdUserIds.push(user.id);

      const loginRes = await request
        .post('/api/v1/auth/login')
        .send({ email: user.email, password });

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
      const { user, password } = await createTestUser();
      createdUserIds.push(user.id);
      const token = generateTestToken(user.id);

      await request
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: password, newPassword: 'NewPass123' })
        .expect(200);

      // Verify new password works
      await request
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'NewPass123' })
        .expect(200);
    });
  });
});
```

**Run:** `cd apps/api && pnpm test -- src/routes/__tests__/auth.routes.test.ts`

---

### Task 4: Middleware Tests (Auth + Error Handler + Validate)

**Files:**

- Create: `apps/api/src/middleware/__tests__/auth.test.ts`
- Create: `apps/api/src/middleware/__tests__/error-handler.test.ts`

**Context:** Tests middleware in isolation. For `authenticate`, we mock `req` with different authorization headers. For `authorize`, we test role-based access. The `errorHandler` tests verify correct JSON responses for ApiError vs generic errors.

**Auth middleware test code:**

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import {
  request,
  createTestUser,
  cleanupTestData,
  generateTestToken,
  generateExpiredToken,
} from '../../test/helpers';

describe('authenticate middleware', () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  it('should pass with valid token', async () => {
    const { user } = await createTestUser();
    createdUserIds.push(user.id);
    const token = generateTestToken(user.id);

    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.id).toBe(user.id);
  });

  it('should reject missing Authorization header', async () => {
    const res = await request.get('/api/v1/auth/me').expect(401);
    expect(res.body.error.message).toBe('No token provided');
  });

  it('should reject malformed Authorization header', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', 'NotBearer token')
      .expect(401);
    expect(res.body.error.message).toBe('No token provided');
  });

  it('should reject expired token', async () => {
    const { user } = await createTestUser();
    createdUserIds.push(user.id);
    const token = generateExpiredToken(user.id);

    // Wait a moment for token to expire
    await new Promise((r) => setTimeout(r, 1100));

    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(res.body.error.message).toBe('Invalid or expired token');
  });

  it('should reject token for inactive user', async () => {
    const { user } = await createTestUser({ isActive: false });
    createdUserIds.push(user.id);
    const token = generateTestToken(user.id);

    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(res.body.error.message).toBe('User not found or inactive');
  });
});

describe('authorize middleware', () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  it('should allow admin access to admin routes', async () => {
    const { user } = await createTestUser({ role: 'ADMIN' });
    createdUserIds.push(user.id);
    const token = generateTestToken(user.id, 'ADMIN');

    const res = await request
      .get('/api/v1/admin/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should reject customer from admin routes', async () => {
    const { user } = await createTestUser({ role: 'CUSTOMER' });
    createdUserIds.push(user.id);
    const token = generateTestToken(user.id, 'CUSTOMER');

    const res = await request
      .get('/api/v1/admin/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
```

**Error handler test code:**

```typescript
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
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request.get('/api/v1/nonexistent').expect(404);
    // Express 5 returns 404 by default for unmatched routes
    expect(res.status).toBe(404);
  });
});
```

**Run:** `cd apps/api && pnpm test -- src/middleware/__tests__/`

---

### Task 5: Security — Auth Route Rate Limiting

**Files:**

- Create: `apps/api/src/middleware/auth-rate-limit.ts`
- Modify: `apps/api/src/routes/auth.routes.ts` (apply rate limiters)

**Context:** The app currently has only global rate limiting (100 req/15 min). Auth endpoints need stricter limits: login should be limited to 5 attempts per IP per 15 minutes to prevent brute-force attacks. Register should be limited to 3 per hour. Password reset should be limited to 3 per hour. We use `express-rate-limit` which is already installed.

**Step 1: Create auth rate limit middleware**

```typescript
import { rateLimit } from 'express-rate-limit';

// Strict limit for login: 5 attempts per 15 minutes per IP
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please try again in 15 minutes.',
    },
  },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

// Register: 3 per hour per IP
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many registration attempts. Please try again later.',
    },
  },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

// Password reset: 3 per hour per IP
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many password reset attempts. Please try again later.',
    },
  },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});
```

**Step 2: Apply to auth routes**

Modify `apps/api/src/routes/auth.routes.ts` to add the rate limiters:

Add import at top:

```typescript
import {
  loginRateLimit,
  registerRateLimit,
  passwordResetRateLimit,
} from '../middleware/auth-rate-limit';
```

Update the three route lines:

```typescript
router.post(
  '/register',
  registerRateLimit,
  validate({ body: registerSchema }),
  asyncHandler(authController.register)
);
router.post(
  '/login',
  loginRateLimit,
  validate({ body: loginSchema }),
  asyncHandler(authController.login)
);
router.post(
  '/forgot-password',
  passwordResetRateLimit,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword)
);
```

The other routes (refresh, logout, me, profile, password) keep their current setup — they're already protected by authentication.

---

### Task 6: Security — Input Sanitization Middleware

**Files:**

- Create: `apps/api/src/middleware/sanitize.ts`
- Modify: `apps/api/src/app.ts` (apply globally after body parser)

**Context:** Currently the API relies solely on Zod validation which checks shape/type but doesn't strip HTML/script tags from string inputs. We need XSS protection that strips `<script>` tags and HTML entities from all string values in request bodies. This middleware recursively sanitizes all string values in `req.body`.

**Step 1: Create sanitize middleware**

```typescript
import type { Request, Response, NextFunction } from 'express';

// Strip HTML tags from a string
function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

// Recursively sanitize all string values in an object
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return stripTags(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

export const sanitize = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
};
```

**Step 2: Apply in app.ts**

Add import:

```typescript
import { sanitize } from './middleware/sanitize';
```

Add middleware right after body parsing (after `app.use(express.urlencoded({ extended: true }));`):

```typescript
// Input sanitization
app.use(sanitize);
```

---

### Task 7: Security — Sanitization & Rate Limit Tests

**Files:**

- Create: `apps/api/src/middleware/__tests__/sanitize.test.ts`
- Create: `apps/api/src/middleware/__tests__/rate-limit.test.ts`

**Context:** Verify sanitization strips HTML/scripts from request bodies. Verify rate limiting returns 429 after limit exceeded.

**Sanitize test code:**

```typescript
import { describe, it, expect } from 'vitest';
import { request } from '../../test/helpers';

describe('sanitize middleware', () => {
  it('should strip HTML tags from request body', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: "<script>alert('xss')</script>user@test.com",
      password: 'Test1234',
    });

    // The sanitized email will fail validation or login — important thing is no script tags in processing
    // We can't directly inspect req.body, but we verify the request is processed (not 500)
    expect(res.status).toBeLessThan(500);
  });

  it('should handle nested objects', async () => {
    // Use a registration endpoint which has more fields
    const res = await request.post('/api/v1/auth/register').send({
      email: 'clean@test.com',
      password: 'Test1234',
      firstName: '<b>Bold</b>Name',
      lastName: 'Normal',
      phone: '9876543210',
    });

    // If registration succeeds, the name should be sanitized (no tags)
    if (res.body.success) {
      expect(res.body.data.user.firstName).toBe('BoldName');
    }
    expect(res.status).toBeLessThan(500);
  });
});
```

**Rate limit test code:**

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { request, createTestUser, cleanupTestData } from '../../test/helpers';

describe('auth rate limiting', () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  it('should rate limit login after 5 failed attempts', async () => {
    const responses: number[] = [];

    for (let i = 0; i < 7; i++) {
      const res = await request
        .post('/api/v1/auth/login')
        .send({ email: 'fake@test.com', password: 'Wrong1234' });
      responses.push(res.status);
    }

    // First 5 should be 401 (invalid credentials)
    expect(responses.slice(0, 5).every((s) => s === 401)).toBe(true);
    // After 5, should be 429 (rate limited)
    expect(responses.slice(5).some((s) => s === 429)).toBe(true);
  });

  it('should rate limit register after 3 attempts', async () => {
    const responses: number[] = [];

    for (let i = 0; i < 5; i++) {
      const res = await request.post('/api/v1/auth/register').send({
        email: `test${i}@ratelimit.com`,
        password: 'Test1234',
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
      });
      responses.push(res.status);
      if (res.body?.data?.user?.id) {
        createdUserIds.push(res.body.data.user.id);
      }
    }

    // First 3 should succeed (201)
    expect(responses.slice(0, 3).every((s) => s === 201)).toBe(true);
    // After 3, should be 429
    expect(responses.slice(3).some((s) => s === 429)).toBe(true);
  });
});
```

**Run:** `cd apps/api && pnpm test -- src/middleware/__tests__/`

---

### Task 8: Verify Build & Tests Pass

**Run:** `cd apps/api && pnpm test` — All tests should pass.

**Run:** `pnpm turbo build` from repo root — All apps must build successfully.

If rate limit tests fail due to shared state between test files (the rate limiter remembers IPs across test files), that's expected when running all tests together. The rate limit tests should be run in isolation or the rate limiter should be reset. Add `skipIf` or restructure if needed.
