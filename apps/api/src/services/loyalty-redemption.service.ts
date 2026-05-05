import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { logger } from '../config/logger';
import { getResend } from '../config/resend';
import { sendWhatsAppLoyaltyCode } from './whatsapp.service';

function randomCode(): string {
  // Human-friendly code shape: ER-RDM-XXXXXXX (no ambiguous chars)
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 7; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `ER-RDM-${suffix}`;
}

/**
 * Create a PENDING redemption request. Admin supplies either the customer's
 * email OR an order number — because many phone-based signups have
 * auto-generated emails the customer doesn't remember. Order-number lookup
 * traces back to the user who placed it.
 *
 * Validates balance but does NOT decrement or mint a code yet — that happens
 * on approve.
 */
export async function createRedemption(params: {
  userEmail?: string;
  orderNumber?: string;
  pointsAmount: number;
  notes?: string;
}) {
  if (!Number.isInteger(params.pointsAmount) || params.pointsAmount <= 0) {
    throw ApiError.badRequest('pointsAmount must be a positive integer');
  }
  const email = params.userEmail?.trim().toLowerCase();
  const orderNumber = params.orderNumber?.trim();
  if (!email && !orderNumber) {
    throw ApiError.badRequest('Either userEmail or orderNumber is required');
  }

  let user: {
    id: string;
    loyaltyPoints: number;
    firstName: string | null;
    email: string;
    phone: string | null;
  } | null = null;

  if (orderNumber) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        user: {
          select: { id: true, loyaltyPoints: true, firstName: true, email: true, phone: true },
        },
      },
    });
    if (!order?.user) throw ApiError.notFound(`No order found with number ${orderNumber}`);
    user = order.user;
  } else if (email) {
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, loyaltyPoints: true, firstName: true, email: true, phone: true },
    });
    if (!user) throw ApiError.notFound('No user with that email');
  }

  if (!user) throw ApiError.notFound('Customer not found');
  if (user.loyaltyPoints < params.pointsAmount) {
    throw ApiError.badRequest(
      `User has ${user.loyaltyPoints} pts but requested ${params.pointsAmount}`
    );
  }

  const redemption = await prisma.loyaltyRedemption.create({
    data: {
      userId: user.id,
      pointsAmount: params.pointsAmount,
      status: 'PENDING',
      notes: params.notes,
    },
  });

  return {
    ...redemption,
    userEmail: user.email,
    userFirstName: user.firstName,
    userPhone: user.phone,
    userCurrentBalance: user.loyaltyPoints,
  };
}

/**
 * Approve a PENDING redemption. Atomically:
 *  - re-verifies the user still has enough points (balance could have shifted
 *    between creation and approval)
 *  - decrements user.loyaltyPoints by the approved amount
 *  - records a REDEEMED loyalty_transaction (audit trail)
 *  - mints a single-use DiscountCode scoped to this user, valid 60 days
 *  - emails the code to the user
 */
export async function approveRedemption(redemptionId: string, adminId: string) {
  const result = await prisma.$transaction(
    async (tx) => {
      const r = await tx.loyaltyRedemption.findUnique({
        where: { id: redemptionId },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, phone: true, loyaltyPoints: true },
          },
        },
      });
      if (!r) throw ApiError.notFound('Redemption not found');
      if (r.status !== 'PENDING') {
        throw ApiError.badRequest(`Redemption is ${r.status}, cannot approve`);
      }
      if (r.user.loyaltyPoints < r.pointsAmount) {
        throw ApiError.badRequest(
          `User now has ${r.user.loyaltyPoints} pts; cannot approve ${r.pointsAmount}`
        );
      }

      // Decrement user balance + audit row
      await tx.user.update({
        where: { id: r.userId },
        data: { loyaltyPoints: { decrement: r.pointsAmount } },
      });
      await tx.loyaltyTransaction.create({
        data: {
          userId: r.userId,
          type: 'REDEEMED',
          points: -r.pointsAmount,
          description: `Redemption #${r.id.slice(-8)} (admin approved)`,
        },
      });

      // Mint a user-scoped, single-use DiscountCode worth ₹pointsAmount.
      // Retry a few times in case of random collision on the code string.
      let code: string | null = null;
      let created = null;
      for (let attempt = 0; attempt < 5 && !code; attempt++) {
        const candidate = randomCode();
        const collision = await tx.discountCode.findUnique({ where: { code: candidate } });
        if (!collision) {
          created = await tx.discountCode.create({
            data: {
              code: candidate,
              description: `Loyalty redemption for user ${r.userId}`,
              type: 'FLAT',
              value: new Prisma.Decimal(r.pointsAmount),
              usageLimit: 1,
              perUserLimit: 1,
              userId: r.userId,
              applicableCategories: [],
              applicableProducts: [],
              isActive: true,
              startsAt: new Date(),
              // Redemption codes don't expire — policy from offers page.
              // Schema has expiresAt as non-nullable, so we use a sentinel
              // far-future date (2099-12-31) which behaves as "never" in all
              // practical comparisons without requiring a schema migration.
              expiresAt: new Date('2099-12-31T23:59:59Z'),
            },
          });
          code = candidate;
        }
      }
      if (!code || !created) throw ApiError.internal('Failed to mint redemption code');

      const updated = await tx.loyaltyRedemption.update({
        where: { id: r.id },
        data: {
          status: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date(),
          discountCodeId: created.id,
        },
      });

      return { redemption: updated, code, user: r.user };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  // Email the code to the user (best-effort, outside the transaction)
  const resend = getResend();
  if (resend && result.user.email) {
    resend.emails
      .send({
        from: process.env.RESEND_FROM_EMAIL || 'Earth Revibe <noreply@earthrevibe.com>',
        to: result.user.email,
        subject: `Your ₹${result.redemption.pointsAmount} loyalty redemption code is ready`,
        html: `
<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;">
  <h1 style="font-size:20px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 16px;">Hi ${result.user.firstName ?? 'there'},</h1>
  <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">Your loyalty redemption request has been approved. Use the code below at checkout for <strong>₹${result.redemption.pointsAmount} off</strong> your next order — no minimum, no expiry catch, just paste and save.</p>
  <div style="background:#000;color:#fff;text-align:center;padding:32px 24px;font-family:'Courier New',monospace;font-size:32px;letter-spacing:6px;font-weight:700;margin:0 0 24px;">${result.code}</div>
  <p style="color:#777;font-size:12px;line-height:1.6;margin:0 0 8px;">• This code is tied to your account and can only be used once.</p>
  <p style="color:#777;font-size:12px;line-height:1.6;margin:0 0 8px;">• Single-use — doesn't expire, use it whenever.</p>
  <p style="color:#777;font-size:12px;line-height:1.6;margin:0 0 24px;">• We've deducted ${result.redemption.pointsAmount} pts from your balance.</p>
  <p style="color:#999;font-size:11px;text-align:center;margin:32px 0 0;">earthrevibe.com · EST. 2024</p>
</body></html>`,
      })
      .then(() => logger.info({ redemptionId: result.redemption.id }, 'Redemption code emailed'))
      .catch((err) =>
        logger.error({ err, redemptionId: result.redemption.id }, 'Failed to email redemption code')
      );
  } else {
    logger.warn({ redemptionId: result.redemption.id }, 'Resend not configured, skipping email');
  }

  // WhatsApp the code too (best-effort, soft-fails if template not approved).
  // Phone-signup users often don't check email — WhatsApp is the reliable channel.
  if (result.user.phone) {
    sendWhatsAppLoyaltyCode(
      result.user.phone,
      result.user.firstName ?? 'there',
      result.code,
      result.redemption.pointsAmount
    )
      .then((ok) =>
        logger.info(
          { redemptionId: result.redemption.id, delivered: ok },
          ok
            ? 'Redemption code WhatsApped'
            : 'WhatsApp template not accepted — email is the fallback'
        )
      )
      .catch((err) =>
        logger.error(
          { err, redemptionId: result.redemption.id },
          'Failed to WhatsApp redemption code'
        )
      );
  } else {
    logger.warn(
      { redemptionId: result.redemption.id },
      'User has no phone on file — WhatsApp delivery skipped'
    );
  }

  return { ...result.redemption, generatedCode: result.code };
}

/**
 * Reject or cancel a PENDING redemption. No DB mutations to user balance.
 */
export async function rejectRedemption(redemptionId: string, adminId: string, reason?: string) {
  const r = await prisma.loyaltyRedemption.findUnique({ where: { id: redemptionId } });
  if (!r) throw ApiError.notFound('Redemption not found');
  if (r.status !== 'PENDING') {
    throw ApiError.badRequest(`Redemption is ${r.status}, cannot reject`);
  }
  return prisma.loyaltyRedemption.update({
    where: { id: r.id },
    data: {
      status: 'REJECTED',
      approvedBy: adminId,
      approvedAt: new Date(),
      notes: reason ? `${r.notes ?? ''}\nRejected: ${reason}`.trim() : r.notes,
    },
  });
}

/**
 * List redemptions, newest first, with user + code info so the admin UI can
 * render everything in one call.
 */
export async function listRedemptions(params: {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const where = params.status ? { status: params.status } : {};

  const [rows, total] = await Promise.all([
    prisma.loyaltyRedemption.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            loyaltyPoints: true,
          },
        },
        discountCode: {
          select: { code: true, expiresAt: true, usageCount: true, usageLimit: true },
        },
      },
    }),
    prisma.loyaltyRedemption.count({ where }),
  ]);

  return {
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
