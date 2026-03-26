import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Ensure pgbouncer=true is set when using Supabase pooler (port 6543)
// This disables prepared statements which are incompatible with PgBouncer transaction mode
function getDatasourceUrl(): string {
  const url =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/earth_revibe';
  if (url.includes(':6543') && !url.includes('pgbouncer=true')) {
    return url + (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
  return url;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: getDatasourceUrl(),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
