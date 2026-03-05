import { beforeAll, afterAll } from "vitest";
import { prisma } from "@earth-revibe/db";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
