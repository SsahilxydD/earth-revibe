# Phase 8: Loyalty & Referrals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build loyalty points system (balance, history, earning/redemption tracking) and referral program (share code, track referrals, earn rewards) with storefront pages.

**Architecture:** Create loyalty and referral API endpoints, fix order service to create LoyaltyTransaction records, then build storefront account pages. All customer-facing controllers use `res.json({ success: true, data: result })`.

**Tech Stack:** Express 5 + Prisma (API), Next.js 16 + React 19 + TanStack Query (Storefront)

---

### Task 1: API — Loyalty Service & Routes

**Files:**

- Create: `apps/api/src/services/loyalty.service.ts`
- Create: `apps/api/src/controllers/loyalty.controller.ts`
- Create: `apps/api/src/routes/loyalty.routes.ts`
- Modify: `apps/api/src/app.ts` (mount router)

**Context:** LoyaltyTransaction has userId, type (EARNED/REDEEMED/BONUS/EXPIRED/ADJUSTED), points, description, orderId (optional). User model has `loyaltyPoints` field. All routes need `authenticate`.

**Step 1: Create loyalty.service.ts**

```typescript
import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';

export const loyaltyService = {
  async getBalance(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    });
    if (!user) throw ApiError.notFound('User not found');
    return { points: user.loyaltyPoints, value: user.loyaltyPoints };
  },

  async getHistory(userId: string, page: number = 1, limit: number = 20) {
    const [transactions, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.loyaltyTransaction.count({ where: { userId } }),
    ]);

    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getSummary(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    });
    if (!user) throw ApiError.notFound('User not found');

    const [earned, redeemed] = await Promise.all([
      prisma.loyaltyTransaction.aggregate({
        where: { userId, type: 'EARNED' },
        _sum: { points: true },
      }),
      prisma.loyaltyTransaction.aggregate({
        where: { userId, type: 'REDEEMED' },
        _sum: { points: true },
      }),
    ]);

    return {
      currentBalance: user.loyaltyPoints,
      totalEarned: earned._sum.points || 0,
      totalRedeemed: Math.abs(redeemed._sum.points || 0),
      pointValue: 1,
    };
  },
};
```

**Step 2: Create loyalty.controller.ts**

```typescript
import type { Request, Response } from 'express';
import { loyaltyService } from '../services/loyalty.service';

export const loyaltyController = {
  async getBalance(req: Request, res: Response) {
    const result = await loyaltyService.getBalance(req.user!.id);
    res.json({ success: true, data: result });
  },

  async getHistory(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await loyaltyService.getHistory(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  },

  async getSummary(req: Request, res: Response) {
    const result = await loyaltyService.getSummary(req.user!.id);
    res.json({ success: true, data: result });
  },
};
```

**Step 3: Create loyalty.routes.ts**

```typescript
import { Router, type IRouter } from 'express';
import { loyaltyController } from '../controllers/loyalty.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router: IRouter = Router();

router.use(authenticate);

router.get('/balance', asyncHandler(loyaltyController.getBalance));
router.get('/history', asyncHandler(loyaltyController.getHistory));
router.get('/summary', asyncHandler(loyaltyController.getSummary));

export { router as loyaltyRouter };
```

**Step 4: Mount in app.ts**

Add import: `import { loyaltyRouter } from "./routes/loyalty.routes";`
Add route: `app.use("/api/v1/loyalty", loyaltyRouter);` (before admin routes)

---

### Task 2: API — Referral Service & Routes

**Files:**

- Create: `apps/api/src/services/referral.service.ts`
- Create: `apps/api/src/controllers/referral.controller.ts`
- Create: `apps/api/src/routes/referral.routes.ts`
- Modify: `apps/api/src/app.ts` (mount router)

**Context:** User has `referralCode` (unique), `referralsMade` (as referrer), `referredBy` (as referee). Referral model has referrerId, refereeId, status (PENDING/SIGNED_UP/CONVERTED), referrerReward, refereeReward. The auth service already creates Referral with SIGNED_UP status on register.

**Step 1: Create referral.service.ts**

```typescript
import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';

export const referralService = {
  async getMyReferralCode(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (!user) throw ApiError.notFound('User not found');
    return { referralCode: user.referralCode };
  },

  async getMyReferrals(userId: string) {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: { firstName: true, lastName: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: referrals.length,
      signedUp: referrals.filter((r) => r.status === 'SIGNED_UP').length,
      converted: referrals.filter((r) => r.status === 'CONVERTED').length,
      totalRewardsEarned: referrals.reduce((sum, r) => sum + (r.referrerReward || 0), 0),
    };

    return { referrals, stats };
  },

  async getReferredBy(userId: string) {
    const referral = await prisma.referral.findUnique({
      where: { refereeId: userId },
      include: {
        referrer: {
          select: { firstName: true, lastName: true },
        },
      },
    });
    return referral;
  },
};
```

**Step 2: Create referral.controller.ts**

```typescript
import type { Request, Response } from 'express';
import { referralService } from '../services/referral.service';

export const referralController = {
  async getMyReferralCode(req: Request, res: Response) {
    const result = await referralService.getMyReferralCode(req.user!.id);
    res.json({ success: true, data: result });
  },

  async getMyReferrals(req: Request, res: Response) {
    const result = await referralService.getMyReferrals(req.user!.id);
    res.json({ success: true, data: result });
  },

  async getReferredBy(req: Request, res: Response) {
    const result = await referralService.getReferredBy(req.user!.id);
    res.json({ success: true, data: result });
  },
};
```

**Step 3: Create referral.routes.ts**

```typescript
import { Router, type IRouter } from 'express';
import { referralController } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router: IRouter = Router();

router.use(authenticate);

router.get('/code', asyncHandler(referralController.getMyReferralCode));
router.get('/my-referrals', asyncHandler(referralController.getMyReferrals));
router.get('/referred-by', asyncHandler(referralController.getReferredBy));

export { router as referralRouter };
```

**Step 4: Mount in app.ts**

Add import: `import { referralRouter } from "./routes/referral.routes";`
Add route: `app.use("/api/v1/referrals", referralRouter);`

---

### Task 3: API — Fix Order Service Loyalty Transactions

**Files:**

- Modify: `apps/api/src/services/order.service.ts`

**Context:** The `verifyPayment` method updates user `loyaltyPoints` but doesn't create `LoyaltyTransaction` records. Also need to handle referral conversion (first purchase by referred user). Add LoyaltyTransaction creates after each points operation and referral conversion logic.

**Changes to `verifyPayment` method:**

After the loyalty points deduction block (line ~242), add:

```typescript
// Create REDEEMED transaction
if (payment.order.loyaltyPointsUsed > 0) {
  await prisma.loyaltyTransaction.create({
    data: {
      userId,
      type: 'REDEEMED',
      points: -payment.order.loyaltyPointsUsed,
      description: `Redeemed for order #${payment.order.orderNumber}`,
      orderId: payment.order.id,
    },
  });
}
```

After the loyalty points earning block (line ~255), add:

```typescript
// Create EARNED transaction
if (pointsEarned > 0) {
  await prisma.loyaltyTransaction.create({
    data: {
      userId,
      type: 'EARNED',
      points: pointsEarned,
      description: `Earned from order #${payment.order.orderNumber}`,
      orderId: payment.order.id,
    },
  });
}

// Handle referral conversion (first purchase by referred user)
const orderCount = await prisma.order.count({
  where: { userId, status: { not: 'CANCELLED' } },
});
if (orderCount === 1) {
  const referral = await prisma.referral.findUnique({
    where: { refereeId: userId },
  });
  if (referral && referral.status === 'SIGNED_UP') {
    const REFERRER_REWARD = 100;
    const REFEREE_REWARD = 50;

    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'CONVERTED',
        referrerReward: REFERRER_REWARD,
        refereeReward: REFEREE_REWARD,
      },
    });

    // Reward referrer
    await prisma.user.update({
      where: { id: referral.referrerId },
      data: { loyaltyPoints: { increment: REFERRER_REWARD } },
    });
    await prisma.loyaltyTransaction.create({
      data: {
        userId: referral.referrerId,
        type: 'BONUS',
        points: REFERRER_REWARD,
        description: 'Referral reward - friend made first purchase',
      },
    });

    // Reward referee
    await prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: REFEREE_REWARD } },
    });
    await prisma.loyaltyTransaction.create({
      data: {
        userId,
        type: 'BONUS',
        points: REFEREE_REWARD,
        description: 'Welcome bonus - first purchase reward',
      },
    });
  }
}
```

---

### Task 4: Storefront — Loyalty Points Page

**Files:**

- Create: `apps/storefront/src/app/(shop)/account/loyalty/page.tsx`

**Context:** Uses storefront api-client (returns `json.data`). Endpoints: `GET /loyalty/summary` (currentBalance, totalEarned, totalRedeemed, pointValue), `GET /loyalty/history?page=N&limit=N` (transactions with pagination). Display stats cards + transaction history table. LoyaltyTransactionType: EARNED, REDEEMED, BONUS, EXPIRED, ADJUSTED.

**Code:**

```tsx
'use client';

import { useState } from 'react';
import { Star, TrendingUp, TrendingDown, Gift } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card, Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';

const typeVariant: Record<string, 'success' | 'error' | 'info' | 'warning' | 'default'> = {
  EARNED: 'success',
  REDEEMED: 'error',
  BONUS: 'info',
  EXPIRED: 'warning',
  ADJUSTED: 'default',
};

const typeLabel: Record<string, string> = {
  EARNED: 'Earned',
  REDEEMED: 'Redeemed',
  BONUS: 'Bonus',
  EXPIRED: 'Expired',
  ADJUSTED: 'Adjusted',
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function LoyaltyPage() {
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['loyalty-summary'],
    queryFn: () => api.get('/loyalty/summary'),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['loyalty-history', page],
    queryFn: () => api.get(`/loyalty/history?page=${page}&limit=15`),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">Loyalty Points</h1>

      {/* Stats */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-forest-green/10 flex items-center justify-center">
                <Star size={20} className="text-forest-green" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-charcoal">
                  {summary?.currentBalance || 0}
                </p>
                <p className="text-xs text-medium-gray">Current Balance</p>
              </div>
            </div>
            <p className="text-xs text-medium-gray mt-2">
              Worth ₹{summary?.currentBalance || 0} on your next order
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-charcoal">{summary?.totalEarned || 0}</p>
                <p className="text-xs text-medium-gray">Total Earned</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingDown size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-charcoal">
                  {summary?.totalRedeemed || 0}
                </p>
                <p className="text-xs text-medium-gray">Total Redeemed</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* How it works */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-3">How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <Gift size={16} className="text-forest-green mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-charcoal">Earn Points</p>
              <p className="text-medium-gray">1 point for every ₹100 spent</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Star size={16} className="text-forest-green mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-charcoal">Redeem</p>
              <p className="text-medium-gray">1 point = ₹1 discount at checkout</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp size={16} className="text-forest-green mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-charcoal">Bonus</p>
              <p className="text-medium-gray">Extra points for referrals</p>
            </div>
          </div>
        </div>
      </Card>

      {/* History */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Points History</h3>
        {historyLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !history?.transactions?.length ? (
          <p className="text-sm text-medium-gray py-4">
            No transactions yet. Start shopping to earn points!
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {history.transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-light-gray last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={typeVariant[tx.type] || 'default'}>
                        {typeLabel[tx.type] || tx.type}
                      </Badge>
                      <span className="text-xs text-medium-gray">{formatDate(tx.createdAt)}</span>
                    </div>
                    <p className="text-sm text-dark-gray mt-1">{tx.description}</p>
                  </div>
                  <span
                    className={`font-semibold ${tx.points > 0 ? 'text-success' : 'text-error'}`}
                  >
                    {tx.points > 0 ? '+' : ''}
                    {tx.points}
                  </span>
                </div>
              ))}
            </div>

            {history.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-light-gray">
                <p className="text-xs text-medium-gray">
                  Page {history.page} of {history.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= history.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
```

---

### Task 5: Storefront — Referrals Page

**Files:**

- Create: `apps/storefront/src/app/(shop)/account/referrals/page.tsx`

**Context:** Uses storefront api-client. Endpoints: `GET /referrals/code` (referralCode), `GET /referrals/my-referrals` (referrals array + stats). Show referral code with copy button, stats, and referral list. The user's referralCode is also in auth store (`user.referralCode`).

**Code:**

```tsx
'use client';

import { useState } from 'react';
import { Gift, Users, Copy, Check, ShoppingBag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button, Card, Badge } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';

const statusVariant: Record<string, 'success' | 'warning' | 'info'> = {
  SIGNED_UP: 'info',
  CONVERTED: 'success',
  PENDING: 'warning',
};

const statusLabel: Record<string, string> = {
  SIGNED_UP: 'Signed Up',
  CONVERTED: 'Purchased',
  PENDING: 'Pending',
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReferralsPage() {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-referrals'],
    queryFn: () => api.get('/referrals/my-referrals'),
  });

  const referralCode = user?.referralCode || '';
  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/register?ref=${referralCode}`
      : '';

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">Referrals</h1>

      {/* Referral code */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-3">Your Referral Code</h3>
        <p className="text-sm text-medium-gray mb-4">
          Share your code with friends. When they sign up and make their first purchase, you both
          earn loyalty points!
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-off-white rounded-lg px-4 py-3 font-mono text-lg font-semibold text-forest-green text-center">
            {referralCode || '—'}
          </div>
          <Button
            variant="secondary"
            onClick={() => handleCopy(referralCode)}
            disabled={!referralCode}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        {referralLink && (
          <div className="mt-3">
            <p className="text-xs text-medium-gray mb-1">Or share this link:</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralLink}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-light-gray bg-off-white text-dark-gray"
              />
              <Button variant="ghost" size="sm" onClick={() => handleCopy(referralLink)}>
                <Copy size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Rewards info */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-3">Rewards</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-off-white rounded-lg">
            <Gift size={20} className="text-forest-green mt-0.5" />
            <div>
              <p className="font-medium text-charcoal">You get 100 points</p>
              <p className="text-sm text-medium-gray">
                When your friend makes their first purchase
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-off-white rounded-lg">
            <ShoppingBag size={20} className="text-forest-green mt-0.5" />
            <div>
              <p className="font-medium text-charcoal">They get 50 points</p>
              <p className="text-sm text-medium-gray">Welcome bonus on first purchase</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        data?.stats && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <div className="text-center">
                <p className="text-2xl font-semibold text-charcoal">{data.stats.total}</p>
                <p className="text-xs text-medium-gray">Total Referrals</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-2xl font-semibold text-charcoal">{data.stats.converted}</p>
                <p className="text-xs text-medium-gray">Converted</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-2xl font-semibold text-forest-green">
                  {data.stats.totalRewardsEarned}
                </p>
                <p className="text-xs text-medium-gray">Points Earned</p>
              </div>
            </Card>
          </div>
        )
      )}

      {/* Referral list */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Your Referrals</h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.referrals?.length ? (
          <div className="text-center py-8">
            <Users size={40} className="mx-auto text-light-gray mb-3" />
            <p className="text-medium-gray">No referrals yet. Share your code to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.referrals.map((ref: any) => (
              <div
                key={ref.id}
                className="flex items-center justify-between py-2 border-b border-light-gray last:border-0"
              >
                <div>
                  <p className="font-medium text-charcoal">
                    {ref.referee?.firstName} {ref.referee?.lastName}
                  </p>
                  <p className="text-xs text-medium-gray">Joined {formatDate(ref.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {ref.referrerReward > 0 && (
                    <span className="text-sm font-medium text-success">
                      +{ref.referrerReward} pts
                    </span>
                  )}
                  <Badge variant={statusVariant[ref.status] || 'default'}>
                    {statusLabel[ref.status] || ref.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
```

---

### Task 6: Verify Build

Run `pnpm turbo build` from the repo root. All apps must build successfully.
