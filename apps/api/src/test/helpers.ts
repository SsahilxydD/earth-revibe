import supertest from 'supertest';
import { prisma } from '@earth-revibe/db';
import { app } from '../app';
import { faker } from '@faker-js/faker';

export const request = supertest(app);

export async function cleanupTestData(userIds: string[]) {
  if (userIds.length === 0) return;
  await prisma.referral.deleteMany({
    where: { OR: [{ referrerId: { in: userIds } }, { refereeId: { in: userIds } }] },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
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
      phone: `+91${faker.number.int({ min: 6, max: 9 })}${faker.string.numeric(9)}`,
      passwordHash: '',
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
