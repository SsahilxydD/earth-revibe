/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Aggressive test harness for the referral system.
 *
 *   pnpm --filter @earth-revibe/api test:referrals
 *   (or) npx tsx apps/api/scripts/test-referrals.ts
 *
 * Runs directly against whatever DATABASE_URL is configured — intended for
 * your dev DB. Creates users + referrals + orders with a TEST_ prefix and
 * cleans everything up at the end, even on failure.
 *
 * No HTTP server or Razorpay is touched; this exercises the service layer
 * where all the real logic lives. Each test is independent: we re-seed two
 * fresh users per scenario so one failure can't cascade.
 */

import { prisma, Prisma } from '@earth-revibe/db';
import {
  computeReferrerReward,
  validateReferralCode,
  maybeLinkReferralAtCheckout,
  convertReferralOnFirstOrder,
} from '../src/services/referral.service';
import { ApiError } from '../src/utils/api-error';

const TEST_PREFIX = 'TEST_REF_';
const TEST_EMAIL_DOMAIN = '@ref-test.earthrevibe.local';

type Result = { name: string; ok: boolean; detail?: string; ms: number };
const results: Result[] = [];

async function run(name: string, fn: () => Promise<void>) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    process.stdout.write(`  ✓ ${name} (${Date.now() - t0}ms)\n`);
  } catch (e: any) {
    const detail = e?.message ?? String(e);
    results.push({ name, ok: false, detail, ms: Date.now() - t0 });
    process.stdout.write(`  ✗ ${name}\n    ${detail}\n`);
  }
}

function assertEq<T>(actual: T, expected: T, msg = 'mismatch') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg}: expected ${e}, got ${a}`);
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

let seq = 0;
function uniq(label: string) {
  seq += 1;
  return `${TEST_PREFIX}${label}_${seq}_${Date.now().toString(36)}`;
}

async function createUser(role: 'referrer' | 'referee' | 'other') {
  const tag = uniq(role);
  return prisma.user.create({
    data: {
      email: `${tag}${TEST_EMAIL_DOMAIN}`,
      firstName: tag,
      lastName: 'Test',
      referralCode: tag,
      loyaltyPoints: 0,
    },
  });
}

async function createAddress(userId: string) {
  return prisma.address.create({
    data: {
      userId,
      fullName: 'Test User',
      phone: '0000000000',
      line1: 'Test address',
      city: 'Test',
      state: 'Test',
      pinCode: '000000',
    },
  });
}

async function cleanup() {
  await prisma.loyaltyTransaction.deleteMany({
    where: { user: { email: { endsWith: TEST_EMAIL_DOMAIN } } },
  });
  await prisma.referral.deleteMany({
    where: {
      OR: [
        { referrer: { email: { endsWith: TEST_EMAIL_DOMAIN } } },
        { referee: { email: { endsWith: TEST_EMAIL_DOMAIN } } },
      ],
    },
  });
  // Orders created by tests (for the "user already has orders" scenario).
  await prisma.order.deleteMany({
    where: { user: { email: { endsWith: TEST_EMAIL_DOMAIN } } },
  });
  await prisma.address.deleteMany({
    where: { user: { email: { endsWith: TEST_EMAIL_DOMAIN } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
}

/**
 * Insert a minimal Order row so the user's orderCount > 0. We bypass
 * createCodOrder intentionally — we're testing the referral logic, not the
 * checkout pipeline.
 */
async function seedOrder(userId: string, status: 'CONFIRMED' | 'CANCELLED' = 'CONFIRMED') {
  const address = await createAddress(userId);
  return prisma.order.create({
    data: {
      orderNumber: uniq('ORD'),
      userId,
      addressId: address.id,
      subtotal: 500,
      discountAmount: 0,
      shippingAmount: 0,
      taxAmount: 0,
      totalAmount: 500,
      loyaltyPointsUsed: 0,
      loyaltyPointsEarned: 0,
      status,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────

async function testComputeRewardMath() {
  assertEq(computeReferrerReward(0), 0, '0 subtotal → 0 pts');
  assertEq(computeReferrerReward(100), 20, '₹100 → 20 pts');
  assertEq(computeReferrerReward(1000), 200, '₹1000 → 200 pts');
  assertEq(computeReferrerReward(2499), 499, '₹2499 → floor(499.8) = 499');
  assertEq(computeReferrerReward(999.99), 199, 'floor on fractional subtotal');
  assertEq(computeReferrerReward(-50), 0, 'negative subtotal clamped to 0');
}

async function testValidateCodeHappyPath() {
  const r = await createUser('referrer');
  const u = await createUser('referee');
  const v = await validateReferralCode(u.id, r.referralCode);
  assertEq(v.valid, true, 'valid should be true');
  assert('referrerName' in v, 'response carries referrer name');
}

async function testValidateCodeSelfReferral() {
  const u = await createUser('referee');
  const v = await validateReferralCode(u.id, u.referralCode);
  assertEq(v.valid, false);
  if (!v.valid) assertEq(v.reason, 'self');
}

async function testValidateCodeInvalid() {
  const u = await createUser('referee');
  const v = await validateReferralCode(u.id, 'DEFINITELY_NOT_A_CODE_XYZ');
  assertEq(v.valid, false);
  if (!v.valid) assertEq(v.reason, 'not-found');
}

async function testValidateCodeAfterPriorOrder() {
  const r = await createUser('referrer');
  const u = await createUser('referee');
  await seedOrder(u.id);
  const v = await validateReferralCode(u.id, r.referralCode);
  assertEq(v.valid, false);
  if (!v.valid) assertEq(v.reason, 'not-first-order');
}

async function testValidateCodeDifferentReferrer() {
  const r1 = await createUser('referrer');
  const r2 = await createUser('other');
  const u = await createUser('referee');
  await prisma.referral.create({
    data: { referrerId: r1.id, refereeId: u.id, status: 'SIGNED_UP' },
  });
  const v = await validateReferralCode(u.id, r2.referralCode);
  assertEq(v.valid, false);
  if (!v.valid) assertEq(v.reason, 'different-referrer');
}

async function testLinkHappyPath() {
  const r = await createUser('referrer');
  const u = await createUser('referee');
  const linked = await maybeLinkReferralAtCheckout(u.id, r.referralCode);
  assertEq(linked, true);
  const row = await prisma.referral.findUnique({ where: { refereeId: u.id } });
  assert(row !== null, 'Referral row should exist');
  assertEq(row!.referrerId, r.id);
  assertEq(row!.status, 'SIGNED_UP');
}

async function testLinkInvalidReturnsFalse() {
  const u = await createUser('referee');
  const linked = await maybeLinkReferralAtCheckout(u.id, 'NOPE');
  assertEq(linked, false, 'caller should fall through to discount-code logic');
}

async function testLinkSelfReferralThrows() {
  const u = await createUser('referee');
  let threw = false;
  try {
    await maybeLinkReferralAtCheckout(u.id, u.referralCode);
  } catch (e) {
    threw = e instanceof ApiError;
  }
  assert(threw, 'self-referral must throw ApiError');
}

async function testLinkTwiceIsIdempotent() {
  const r = await createUser('referrer');
  const u = await createUser('referee');
  const a = await maybeLinkReferralAtCheckout(u.id, r.referralCode);
  const b = await maybeLinkReferralAtCheckout(u.id, r.referralCode);
  assertEq(a, true);
  assertEq(b, true);
  const rows = await prisma.referral.count({ where: { refereeId: u.id } });
  assertEq(rows, 1, 'still exactly one Referral row after two identical links');
}

async function testLinkRejectsSecondDifferentReferrer() {
  const r1 = await createUser('referrer');
  const r2 = await createUser('other');
  const u = await createUser('referee');
  await maybeLinkReferralAtCheckout(u.id, r1.referralCode);
  let threw = false;
  try {
    await maybeLinkReferralAtCheckout(u.id, r2.referralCode);
  } catch (e) {
    threw = e instanceof ApiError;
  }
  assert(threw, 'switching referrers mid-flow must throw');
}

async function testConvertCreditsBothParties() {
  const r = await createUser('referrer');
  const u = await createUser('referee');
  await maybeLinkReferralAtCheckout(u.id, r.referralCode);
  await seedOrder(u.id); // first order

  const credited = await prisma.$transaction(
    async (tx) => convertReferralOnFirstOrder(tx, u.id, 1000, 'TEST-ORD'),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
  assert(credited.credited, 'should credit on first order');
  if (!credited.credited) return;
  assertEq(credited.referrerReward, 200);
  assertEq(credited.refereeReward, 50);

  const rAfter = await prisma.user.findUnique({ where: { id: r.id } });
  const uAfter = await prisma.user.findUnique({ where: { id: u.id } });
  assertEq(rAfter!.loyaltyPoints, 200);
  assertEq(uAfter!.loyaltyPoints, 50);

  const refRow = await prisma.referral.findUnique({ where: { refereeId: u.id } });
  assertEq(refRow!.status, 'CONVERTED');
  assertEq(refRow!.referrerReward, 200);
  assertEq(refRow!.refereeReward, 50);

  const bonusTxns = await prisma.loyaltyTransaction.count({
    where: { userId: { in: [r.id, u.id] }, type: 'BONUS' },
  });
  assertEq(bonusTxns, 2, 'one BONUS transaction per party');
}

async function testConvertNoOpOnSecondOrder() {
  const r = await createUser('referrer');
  const u = await createUser('referee');
  await maybeLinkReferralAtCheckout(u.id, r.referralCode);
  await seedOrder(u.id);
  await seedOrder(u.id);

  const credited = await prisma.$transaction(
    async (tx) => convertReferralOnFirstOrder(tx, u.id, 1000, 'TEST-ORD'),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
  assertEq(credited.credited, false, 'must not credit after second order');

  const rAfter = await prisma.user.findUnique({ where: { id: r.id } });
  assertEq(rAfter!.loyaltyPoints, 0, 'referrer balance stays at 0');
}

async function testConvertIdempotentWithinSameOrder() {
  const r = await createUser('referrer');
  const u = await createUser('referee');
  await maybeLinkReferralAtCheckout(u.id, r.referralCode);
  await seedOrder(u.id);

  // Fire convert twice — simulates a buggy caller. The status guard prevents
  // double-credit.
  const a = await prisma.$transaction(
    async (tx) => convertReferralOnFirstOrder(tx, u.id, 2000, 'TEST-ORD'),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
  const b = await prisma.$transaction(
    async (tx) => convertReferralOnFirstOrder(tx, u.id, 2000, 'TEST-ORD'),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
  assertEq(a.credited, true);
  assertEq(b.credited, false, 'second call is a no-op');

  const rAfter = await prisma.user.findUnique({ where: { id: r.id } });
  assertEq(rAfter!.loyaltyPoints, 400, 'credited exactly once (20% of 2000)');
}

async function testConvertWithoutLinkedReferral() {
  const u = await createUser('referee');
  await seedOrder(u.id);
  const credited = await prisma.$transaction(
    async (tx) => convertReferralOnFirstOrder(tx, u.id, 1000, 'TEST-ORD'),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
  assertEq(credited.credited, false, 'no credit when no Referral row exists');
}

async function testCancelledOrderDoesNotBlockFirstOrder() {
  const r = await createUser('referrer');
  const u = await createUser('referee');
  await maybeLinkReferralAtCheckout(u.id, r.referralCode);
  // Cancelled prior order — should NOT count toward first-order guard.
  await seedOrder(u.id, 'CANCELLED');
  // Now place the real first order.
  await seedOrder(u.id, 'CONFIRMED');
  const credited = await prisma.$transaction(
    async (tx) => convertReferralOnFirstOrder(tx, u.id, 1500, 'TEST-ORD'),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
  assert(credited.credited, 'cancelled orders are excluded from count');
  if (credited.credited) assertEq(credited.referrerReward, 300);
}

async function testConcurrentCreditsOnlyFireOnce() {
  const r = await createUser('referrer');
  const u = await createUser('referee');
  await maybeLinkReferralAtCheckout(u.id, r.referralCode);
  await seedOrder(u.id);

  // Fire two converts in parallel. The serializable isolation + status guard
  // means at most one should credit. If both credit we'd end up at 400 pts.
  const [a, b] = await Promise.allSettled([
    prisma.$transaction(
      async (tx) => convertReferralOnFirstOrder(tx, u.id, 1000, 'TEST-ORD'),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    ),
    prisma.$transaction(
      async (tx) => convertReferralOnFirstOrder(tx, u.id, 1000, 'TEST-ORD'),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    ),
  ]);
  const outcomes = [a, b].map((s) =>
    s.status === 'fulfilled' ? (s.value as any).credited : 'rejected'
  );
  const credited = outcomes.filter((x) => x === true).length;
  assert(credited <= 1, `at most one should credit, got ${credited}: ${JSON.stringify(outcomes)}`);

  const rAfter = await prisma.user.findUnique({ where: { id: r.id } });
  assert(
    rAfter!.loyaltyPoints === 0 || rAfter!.loyaltyPoints === 200,
    `referrer points must be 0 or 200, got ${rAfter!.loyaltyPoints}`
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  process.stdout.write('\n🧪  Referral system — aggressive test suite\n\n');

  // Clean any stale data from a previous failed run before we start.
  await cleanup();

  await run('compute: reward math (floor, clamp, fractions)', testComputeRewardMath);
  await run('validate: happy path', testValidateCodeHappyPath);
  await run('validate: self-referral rejected', testValidateCodeSelfReferral);
  await run('validate: invalid code', testValidateCodeInvalid);
  await run('validate: rejected after prior order', testValidateCodeAfterPriorOrder);
  await run('validate: rejected when different referrer already linked', testValidateCodeDifferentReferrer);
  await run('link: happy path creates Referral row', testLinkHappyPath);
  await run('link: invalid code returns false (caller tries discount)', testLinkInvalidReturnsFalse);
  await run('link: self-referral throws', testLinkSelfReferralThrows);
  await run('link: idempotent when same code retried', testLinkTwiceIsIdempotent);
  await run('link: rejects second different referrer', testLinkRejectsSecondDifferentReferrer);
  await run('convert: credits both parties on first order', testConvertCreditsBothParties);
  await run('convert: no-op when past first order', testConvertNoOpOnSecondOrder);
  await run('convert: idempotent (status guard prevents double-credit)', testConvertIdempotentWithinSameOrder);
  await run('convert: no-op when no Referral row exists', testConvertWithoutLinkedReferral);
  await run('convert: cancelled prior order excluded from count', testCancelledOrderDoesNotBlockFirstOrder);
  await run('convert: concurrent converts credit at most once', testConcurrentCreditsOnlyFireOnce);

  await cleanup();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  process.stdout.write(`\n  ${passed} passed, ${failed} failed\n\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main()
  .catch(async (err) => {
    process.stderr.write(`\nfatal: ${err?.stack ?? err}\n`);
    await cleanup().catch(() => {});
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
