/**
 * Emergency teardown for any leaked rows from test-referrals.ts. Run this if
 * a crash during the main test suite prevented the automatic cleanup.
 *
 *   pnpm --filter @earth-revibe/api test:referrals:cleanup
 */

import { prisma } from '@earth-revibe/db';

const TEST_EMAIL_DOMAIN = '@ref-test.earthrevibe.local';

async function main() {
  const filter = { email: { endsWith: TEST_EMAIL_DOMAIN } };

  const loyaltyTxns = await prisma.loyaltyTransaction.deleteMany({
    where: { user: filter },
  });
  const referrals = await prisma.referral.deleteMany({
    where: {
      OR: [{ referrer: filter }, { referee: filter }],
    },
  });
  const orders = await prisma.order.deleteMany({ where: { user: filter } });
  const addresses = await prisma.address.deleteMany({ where: { user: filter } });
  const users = await prisma.user.deleteMany({ where: filter });

  process.stdout.write(
    `cleaned: ${users.count} users, ${orders.count} orders, ${addresses.count} addresses, ` +
      `${referrals.count} referrals, ${loyaltyTxns.count} loyalty txns\n`
  );
}

main()
  .catch((err) => {
    process.stderr.write(`cleanup failed: ${err?.stack ?? err}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
