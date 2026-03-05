import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/earth_revibe",
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
