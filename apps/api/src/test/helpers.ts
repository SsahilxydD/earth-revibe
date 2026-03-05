import supertest from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@earth-revibe/db";
import { app } from "../app";
import { env } from "../config/env";
import { faker } from "@faker-js/faker";

export const request = supertest(app);

export async function cleanupTestData(userIds: string[]) {
  if (userIds.length === 0) return;
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.referral.deleteMany({
    where: { OR: [{ referrerId: { in: userIds } }, { refereeId: { in: userIds } }] },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

export async function createTestUser(overrides: {
  role?: string;
  isActive?: boolean;
  email?: string;
} = {}) {
  const password = "Test1234";
  const passwordHash = await bcrypt.hash(password, 4);

  const user = await prisma.user.create({
    data: {
      email: overrides.email || faker.internet.email().toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number({ style: "national" }),
      passwordHash,
      role: (overrides.role as any) || "CUSTOMER",
      isActive: overrides.isActive ?? true,
      referralCode: `TEST-${faker.string.alphanumeric(6).toUpperCase()}`,
    },
  });

  return { user, password };
}

export function generateTestToken(userId: string, role: string = "CUSTOMER") {
  return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

export function generateExpiredToken(userId: string, role: string = "CUSTOMER") {
  return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: "0s" });
}

export function makeRegisterPayload(overrides: Record<string, any> = {}) {
  return {
    email: faker.internet.email().toLowerCase(),
    password: "Test1234",
    confirmPassword: "Test1234",
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: "9876543210",
    ...overrides,
  };
}
