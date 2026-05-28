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
    // Interactive transactions hold several sequential round-trips (e.g. the
    // offline-order stock-decrement loop + order create) against the Supabase
    // PgBouncer pooler, whose per-query latency adds up. Prisma's 5s default
    // expired them mid-flight under that latency (P2028 "Transaction already
    // closed"). Raise the defaults globally so every transaction in the API has
    // headroom; individual $transaction calls can still override these.
    transactionOptions: {
      maxWait: 10_000, // wait up to 10s to acquire a pooled connection
      timeout: 30_000, // allow a transaction up to 30s to complete
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
