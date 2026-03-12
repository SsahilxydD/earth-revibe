import { beforeAll, afterAll } from "vitest";
import { prisma } from "@earth-revibe/db";

beforeAll(async () => {
  try {
    await prisma.$connect();
  } catch {
    // DB connection is optional for unit tests with mocks
  }
});

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect errors
  }
});
