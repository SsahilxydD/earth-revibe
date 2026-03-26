import supertest from 'supertest';
import { prisma } from '@earth-revibe/db';
import { app } from '../app';
import { faker } from '@faker-js/faker';
import { getSupabaseAdmin } from '../config/supabase';

export const request = supertest(app);

/**
 * Check if Supabase is configured for integration tests.
 * Integration tests require a real Supabase instance.
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.SUPABASE_URL &&
    !process.env.SUPABASE_URL.includes('test.supabase.co') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
  );
}

export async function cleanupTestData(userIds: string[]) {
  if (userIds.length === 0) return;
  // Clean up Prisma records
  await prisma.referral.deleteMany({
    where: { OR: [{ referrerId: { in: userIds } }, { refereeId: { in: userIds } }] },
  });
  // Get emails before deleting Prisma users so we can clean up Supabase
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { email: true },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  // Clean up Supabase Auth users
  if (isSupabaseConfigured() && users.length > 0) {
    const supabase = getSupabaseAdmin();
    const { data: supabaseUsers } = await supabase.auth.admin.listUsers();
    if (supabaseUsers?.users) {
      const emails = new Set(users.map((u) => u.email));
      for (const su of supabaseUsers.users) {
        if (su.email && emails.has(su.email)) {
          await supabase.auth.admin.deleteUser(su.id);
        }
      }
    }
  }
}

export async function createTestUser(
  overrides: {
    role?: string;
    isActive?: boolean;
    email?: string;
  } = {}
) {
  const user = await prisma.user.create({
    data: {
      email: overrides.email || faker.internet.email().toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number({ style: 'national' }),
      passwordHash: 'supabase-managed',
      role: (overrides.role as any) || 'CUSTOMER',
      isActive: overrides.isActive ?? true,
      referralCode: `TEST-${faker.string.alphanumeric(6).toUpperCase()}`,
      emailVerified: true,
    },
  });

  return { user };
}

export function makeRegisterPayload(overrides: Record<string, any> = {}) {
  return {
    email: faker.internet.email().toLowerCase(),
    password: 'Test1234',
    confirmPassword: 'Test1234',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: `${faker.number.int({ min: 6, max: 9 })}${faker.string.numeric(9)}`,
    ...overrides,
  };
}
