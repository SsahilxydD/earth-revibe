import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { processOneAbandonedCart, processOneGuestAbandonedCart } from '../jobs/abandoned-cart-job';

/**
 * Admin-facing service for the abandoned-carts page. Reads from both the
 * `Cart` (logged-in users) and `GuestAbandonedCart` tables and exposes them
 * as a single unified list. Manual single-row sends share the same
 * `processOne*` helpers as the cron sweep so retry/marking semantics stay
 * identical.
 */

export type AbandonedCartKind = 'user' | 'guest';

export interface AbandonedCartListItem {
  id: string;
  kind: AbandonedCartKind;
  email: string | null;
  phone: string | null; // guests have no phone
  firstName: string | null;
  itemCount: number;
  cartTotal: number;
  hasWhatsApp: boolean;
  hasEmail: boolean;
  recoverySentAt: string | null;
  updatedAt: string;
  createdAt: string;
  items: { name: string; quantity: number; price: number; slug: string }[];
}

export interface AbandonedCartListParams {
  page?: number;
  limit?: number;
  status?: 'all' | 'pending' | 'sent';
  search?: string;
}

interface ListResult {
  data: AbandonedCartListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: { totalPending: number; totalSent: number; usersPending: number; guestsPending: number };
}

/**
 * Window: only show carts updated in the last 14 days. Older entries are
 * effectively dead — users have moved on, and showing them clutters the page.
 */
const WINDOW_DAYS = 14;

export async function listAbandonedCarts(
  params: AbandonedCartListParams = {}
): Promise<ListResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));
  const status = params.status ?? 'all';
  const search = params.search?.trim().toLowerCase() ?? '';
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // ── Logged-in user carts ────────────────────────────────────────────
  const userCartWhere = {
    items: { some: {} },
    updatedAt: { gte: since },
    ...(status === 'pending' ? { abandonedEmailSentAt: null } : {}),
    ...(status === 'sent' ? { abandonedEmailSentAt: { not: null } } : {}),
    ...(search
      ? {
          OR: [
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
            { user: { phone: { contains: search } } },
            { user: { firstName: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const userCarts = await prisma.cart.findMany({
    where: userCartWhere,
    include: {
      user: { select: { email: true, phone: true, firstName: true } },
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true, slug: true, price: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // ── Guest carts ──────────────────────────────────────────────────────
  const guestCartWhere = {
    updatedAt: { gte: since },
    ...(status === 'pending' ? { emailSent: false } : {}),
    ...(status === 'sent' ? { emailSent: true } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const guestCarts = await prisma.guestAbandonedCart.findMany({
    where: guestCartWhere,
    orderBy: { updatedAt: 'desc' },
  });

  // ── Map to unified list ──────────────────────────────────────────────
  const userRows: AbandonedCartListItem[] = userCarts
    .filter((c) => c.user) // sanity — Cart.user is required by schema but be safe
    .map((c) => {
      const items = c.items.map((it) => ({
        name: it.variant.product.name,
        quantity: it.quantity,
        price: Number(it.variant.product.price),
        slug: it.variant.product.slug,
      }));
      return {
        id: c.id,
        kind: 'user' as const,
        email: c.user!.email ?? null,
        phone: c.user!.phone ?? null,
        firstName: c.user!.firstName ?? null,
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
        cartTotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
        hasWhatsApp: !!c.user!.phone,
        hasEmail: !!c.user!.email,
        recoverySentAt: c.abandonedEmailSentAt?.toISOString() ?? null,
        updatedAt: c.updatedAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
        items,
      };
    });

  const guestRows: AbandonedCartListItem[] = guestCarts.map((g) => {
    const items = (
      g.items as { productName: string; slug: string; price: number; quantity: number }[]
    ).map((it) => ({
      name: it.productName,
      quantity: it.quantity,
      price: Number(it.price),
      slug: it.slug,
    }));
    return {
      id: g.id,
      kind: 'guest' as const,
      email: g.email,
      phone: null,
      firstName: g.firstName ?? null,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      cartTotal: Number(g.cartTotal),
      hasWhatsApp: false,
      hasEmail: !!g.email,
      recoverySentAt: g.emailSent ? g.updatedAt.toISOString() : null,
      updatedAt: g.updatedAt.toISOString(),
      createdAt: g.createdAt.toISOString(),
      items,
    };
  });

  const all = [...userRows, ...guestRows].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = all.slice(start, start + limit);

  // Stats — counts across both tables, ignoring search/status filters but
  // respecting the 14-day window.
  const [usersPending, usersSent, guestsPending, guestsSent] = await Promise.all([
    prisma.cart.count({
      where: { items: { some: {} }, updatedAt: { gte: since }, abandonedEmailSentAt: null },
    }),
    prisma.cart.count({
      where: {
        items: { some: {} },
        updatedAt: { gte: since },
        abandonedEmailSentAt: { not: null },
      },
    }),
    prisma.guestAbandonedCart.count({ where: { updatedAt: { gte: since }, emailSent: false } }),
    prisma.guestAbandonedCart.count({ where: { updatedAt: { gte: since }, emailSent: true } }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages },
    stats: {
      totalPending: usersPending + guestsPending,
      totalSent: usersSent + guestsSent,
      usersPending,
      guestsPending,
    },
  };
}

export async function sendOneRecovery(kind: AbandonedCartKind, id: string) {
  if (kind === 'user') {
    const cart = await prisma.cart.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, phone: true, firstName: true, whatsappOptIn: true },
        },
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, slug: true, price: true } },
              },
            },
          },
        },
      },
    });
    if (!cart) throw ApiError.notFound('Cart not found');
    if (cart.items.length === 0) throw ApiError.badRequest('Cart is empty');
    const result = await processOneAbandonedCart(cart);
    return { kind, id, ...result };
  }

  const guest = await prisma.guestAbandonedCart.findUnique({ where: { id } });
  if (!guest) throw ApiError.notFound('Guest cart not found');
  const result = await processOneGuestAbandonedCart(guest);
  return { kind, id, ...result };
}
