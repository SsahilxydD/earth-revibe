import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { adminRefundController } from '../admin-refund.controller';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockTx = {
  payment: { update: vi.fn() },
  order: { update: vi.fn() },
  orderStatusHistory: { create: vi.fn() },
  productVariant: { update: vi.fn() },
  user: { update: vi.fn() },
  loyaltyTransaction: { create: vi.fn() },
  // The refund flow links an open return request (if any) via return.service —
  // findFirst resolving null = refund not tied to a return (no-op path).
  returnRequest: { findFirst: vi.fn(), update: vi.fn() },
  returnStatusHistory: { create: vi.fn() },
};

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    order: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  Prisma: {},
}));

vi.mock('../../config/razorpay', () => ({
  getRazorpay: vi.fn(),
}));

import { prisma } from '@earth-revibe/db';
import { getRazorpay } from '../../config/razorpay';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildOrder(overrides: Partial<any> = {}): any {
  return {
    id: 'order-1',
    orderNumber: 'ORD-001',
    userId: 'user-1',
    status: 'DELIVERED',
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 0,
    items: [{ id: 'item-1', variantId: 'variant-1', quantity: 2 }],
    payment: {
      id: 'payment-1',
      status: 'CAPTURED',
      amount: '500.00',
      razorpayPaymentId: 'pay_test123',
    },
    ...overrides,
  };
}

function buildRequest(params: Partial<any> = {}, body: Partial<any> = {}): Partial<Request> {
  return {
    params: { orderNumber: 'ORD-001', ...params },
    body: { reason: 'Customer requested refund', ...body },
    user: { id: 'admin-1' } as any,
  };
}

function buildResponse(): Partial<Response> {
  return { json: vi.fn() };
}

// Configure $transaction to execute the callback with the mock transaction client
function setupTransaction() {
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(mockTx));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Reset all mockTx sub-methods
  Object.values(mockTx).forEach((obj) => Object.values(obj).forEach((fn: any) => fn.mockReset()));
  setupTransaction();
});

describe('adminRefundController.initiateRefund — input validation', () => {
  it('throws badRequest when reason is missing', async () => {
    const req = buildRequest({}, { reason: undefined }) as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('throws badRequest when reason is an empty string', async () => {
    const req = buildRequest({}, { reason: '   ' }) as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('throws badRequest when reason is not a string', async () => {
    const req = buildRequest({}, { reason: 123 }) as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('throws badRequest when amount is zero', async () => {
    // amount validation fires before DB lookup — no mock needed
    const req = buildRequest({}, { reason: 'Valid reason', amount: 0 }) as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('throws badRequest when amount is negative', async () => {
    const req = buildRequest({}, { reason: 'Valid reason', amount: -100 }) as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('throws badRequest when amount is Infinity', async () => {
    const req = buildRequest({}, { reason: 'Valid reason', amount: Infinity }) as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('throws badRequest when amount is NaN', async () => {
    const req = buildRequest({}, { reason: 'Valid reason', amount: NaN }) as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });
});

describe('adminRefundController.initiateRefund — order / payment guards', () => {
  it('throws notFound when order does not exist', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws badRequest when order has no payment', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(buildOrder({ payment: null }));
    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'No payment found for this order',
    });
  });

  it('throws badRequest when payment status is not CAPTURED', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(
      buildOrder({
        payment: { id: 'p-1', status: 'PENDING', amount: '500', razorpayPaymentId: 'pay_x' },
      })
    );
    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('throws badRequest when order status is CANCELLED', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(buildOrder({ status: 'CANCELLED' }));
    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('throws badRequest when order status is CANCELLED', async () => {
    // In the six-status model, REFUNDED is no longer an order status — refund
    // state lives on Payment.status. The only order-status rejection now is
    // CANCELLED (refunding a cancelled order doesn't make sense; refund
    // happens at cancel time via the cancel flow).
    vi.mocked(prisma.order.findUnique).mockResolvedValue(buildOrder({ status: 'CANCELLED' }));
    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('throws badRequest when no razorpayPaymentId exists', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(
      buildOrder({
        payment: { id: 'p-1', status: 'CAPTURED', amount: '500', razorpayPaymentId: null },
      })
    );
    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: expect.stringContaining('No Razorpay payment ID'),
    });
  });

  it('throws badRequest when partial amount exceeds payment amount', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(buildOrder());
    const req = buildRequest({}, { reason: 'Overcharge', amount: 600 }) as Request;
    const res = buildResponse() as Response;

    await expect(adminRefundController.initiateRefund(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: expect.stringContaining('cannot exceed'),
    });
  });
});

describe('adminRefundController.initiateRefund — full refund flow', () => {
  it('calls Razorpay refund with amount in paise and trimmed reason', async () => {
    const order = buildOrder();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    const mockRefund = vi.fn().mockResolvedValue({ id: 'rfnd_001' });
    vi.mocked(getRazorpay).mockReturnValue({ payments: { refund: mockRefund } } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});

    const req = buildRequest({}, { reason: '  Damaged item  ' }) as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(mockRefund).toHaveBeenCalledWith('pay_test123', {
      amount: 50000, // 500.00 * 100
      notes: { reason: 'Damaged item', orderNumber: 'ORD-001' },
    });
  });

  it('sets payment status to REFUNDED on full refund', async () => {
    const order = buildOrder();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});

    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(mockTx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payment-1' },
        data: expect.objectContaining({ status: 'REFUNDED', refundId: 'rfnd_001' }),
      })
    );
  });

  it('does not change order.status on full refund (refund lives on Payment in 6-status model)', async () => {
    const order = buildOrder();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});

    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    // Order.status should NOT be mutated by the refund — Payment.status carries
    // the REFUNDED truth (verified by the earlier payment.update assertion).
    expect(mockTx.order.update).not.toHaveBeenCalled();
  });

  it('restores stock for each line item on full refund', async () => {
    const order = buildOrder({
      items: [
        { id: 'item-1', variantId: 'variant-1', quantity: 3 },
        { id: 'item-2', variantId: 'variant-2', quantity: 1 },
      ],
    });
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});

    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(mockTx.productVariant.update).toHaveBeenCalledTimes(2);
    expect(mockTx.productVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'variant-1' },
        data: { stock: { increment: 3 } },
      })
    );
    expect(mockTx.productVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'variant-2' },
        data: { stock: { increment: 1 } },
      })
    );
  });

  it('restores loyalty points used and claws back points earned on full refund', async () => {
    const order = buildOrder({ loyaltyPointsUsed: 50, loyaltyPointsEarned: 25 });
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.user.update.mockResolvedValue({});
    mockTx.loyaltyTransaction.create.mockResolvedValue({});

    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    // Restore used points
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { loyaltyPoints: { increment: 50 } },
      })
    );
    // Claw back earned points
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { loyaltyPoints: { decrement: 25 } },
      })
    );
    expect(mockTx.loyaltyTransaction.create).toHaveBeenCalledTimes(2);
  });

  it('creates an OrderStatusHistory entry with REFUNDED status on full refund', async () => {
    const order = buildOrder();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});

    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(mockTx.orderStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'order-1',
          // History row keeps the current order.status — the refund is
          // captured by the note + by Payment.status, not by mutating Order.
          status: 'DELIVERED',
          changedBy: 'admin-1',
        }),
      })
    );
  });

  it('returns correct response shape with isFullRefund=true', async () => {
    const order = buildOrder();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});

    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        refundId: 'rfnd_001',
        orderNumber: 'ORD-001',
        refundAmount: 500,
        isFullRefund: true,
        status: 'REFUNDED',
      },
    });
  });
});

describe('adminRefundController.initiateRefund — partial refund flow', () => {
  it('sets payment status to PARTIALLY_REFUNDED on partial refund', async () => {
    const order = buildOrder();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_partial_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});

    const req = buildRequest({}, { reason: 'Partial damage', amount: 200 }) as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(mockTx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PARTIALLY_REFUNDED' }),
      })
    );
  });

  it('does not update order status on partial refund', async () => {
    const order = buildOrder();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_partial_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});

    const req = buildRequest({}, { reason: 'Partial damage', amount: 200 }) as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(mockTx.order.update).not.toHaveBeenCalled();
  });

  it('does not restore stock on partial refund', async () => {
    const order = buildOrder();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_partial_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});

    const req = buildRequest({}, { reason: 'Partial damage', amount: 200 }) as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(mockTx.productVariant.update).not.toHaveBeenCalled();
  });

  it('sends partial refund amount in paise to Razorpay', async () => {
    const order = buildOrder();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    const mockRefund = vi.fn().mockResolvedValue({ id: 'rfnd_partial_001' });
    vi.mocked(getRazorpay).mockReturnValue({ payments: { refund: mockRefund } } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});

    const req = buildRequest({}, { reason: 'Partial damage', amount: 250 }) as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(mockRefund).toHaveBeenCalledWith(
      'pay_test123',
      expect.objectContaining({ amount: 25000 })
    );
  });

  it('returns correct response shape with isFullRefund=false', async () => {
    const order = buildOrder();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_partial_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});

    const req = buildRequest({}, { reason: 'Partial damage', amount: 200 }) as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        refundId: 'rfnd_partial_001',
        orderNumber: 'ORD-001',
        refundAmount: 200,
        isFullRefund: false,
        status: 'PARTIALLY_REFUNDED',
      },
    });
  });
});

describe('adminRefundController.initiateRefund — loyalty edge cases', () => {
  it('does not restore loyalty points when both usedPoints and earnedPoints are zero', async () => {
    const order = buildOrder({ loyaltyPointsUsed: 0, loyaltyPointsEarned: 0 });
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});

    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(mockTx.user.update).not.toHaveBeenCalled();
    expect(mockTx.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  it('only restores used points when earnedPoints is zero', async () => {
    const order = buildOrder({ loyaltyPointsUsed: 100, loyaltyPointsEarned: 0 });
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(getRazorpay).mockReturnValue({
      payments: { refund: vi.fn().mockResolvedValue({ id: 'rfnd_001' }) },
    } as any);
    mockTx.payment.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({});
    mockTx.orderStatusHistory.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.user.update.mockResolvedValue({});
    mockTx.loyaltyTransaction.create.mockResolvedValue({});

    const req = buildRequest() as Request;
    const res = buildResponse() as Response;

    await adminRefundController.initiateRefund(req, res);

    expect(mockTx.user.update).toHaveBeenCalledTimes(1);
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { loyaltyPoints: { increment: 100 } } })
    );
    expect(mockTx.loyaltyTransaction.create).toHaveBeenCalledTimes(1);
  });
});
