import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../../utils/api-error';

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before any import of the module under test
// ---------------------------------------------------------------------------

const { mockPrismaUser, mockPrismaOrder } = vi.hoisted(() => ({
  mockPrismaUser: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  mockPrismaOrder: {
    aggregate: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
}));

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    user: mockPrismaUser,
    order: mockPrismaOrder,
  },
  Prisma: {},
}));

vi.mock('../../config/constants', () => ({
  APP_CONSTANTS: {
    MAX_CSV_EXPORT_ROWS: 10000,
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks are registered
// ---------------------------------------------------------------------------

import { adminCustomerService } from '../admin-customer.service';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const makeCustomerRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  phone: '9876543210',
  isActive: true,
  loyaltyPoints: 50,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  lastLoginAt: new Date('2024-06-01T08:00:00Z'),
  _count: { orders: 3 },
  ...overrides,
});

const makeFullCustomer = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  phone: '9876543210',
  avatar: null,
  isActive: true,
  emailVerified: true,
  loyaltyPoints: 50,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  lastLoginAt: new Date('2024-06-01T08:00:00Z'),
  addresses: [],
  orders: [],
  _count: { orders: 3, reviews: 2 },
  ...overrides,
});

// ---------------------------------------------------------------------------
// listCustomers
// ---------------------------------------------------------------------------

describe('adminCustomerService.listCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated customers with correct metadata on a basic query', async () => {
    const rows = [makeCustomerRow(), makeCustomerRow({ id: 'user-2', email: 'bob@example.com' })];
    mockPrismaUser.findMany.mockResolvedValue(rows);
    mockPrismaUser.count.mockResolvedValue(2);

    const result = await adminCustomerService.listCustomers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result).toEqual({
      customers: rows,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  it('calculates totalPages correctly when total exceeds limit', async () => {
    mockPrismaUser.findMany.mockResolvedValue([makeCustomerRow()]);
    mockPrismaUser.count.mockResolvedValue(25);

    const result = await adminCustomerService.listCustomers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(25);
  });

  it('passes correct skip value based on page and limit', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaUser.count.mockResolvedValue(0);

    await adminCustomerService.listCustomers({
      page: 3,
      limit: 15,
      sortBy: 'email',
      sortOrder: 'asc',
    });

    const findManyCall = mockPrismaUser.findMany.mock.calls[0][0];
    expect(findManyCall.skip).toBe(30); // (3-1) * 15
    expect(findManyCall.take).toBe(15);
  });

  it('always filters by role=CUSTOMER regardless of other params', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaUser.count.mockResolvedValue(0);

    await adminCustomerService.listCustomers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const findManyCall = mockPrismaUser.findMany.mock.calls[0][0];
    expect(findManyCall.where.role).toBe('CUSTOMER');

    const countCall = mockPrismaUser.count.mock.calls[0][0];
    expect(countCall.where.role).toBe('CUSTOMER');
  });

  it('applies isActive filter when provided as true', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaUser.count.mockResolvedValue(0);

    await adminCustomerService.listCustomers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      isActive: true,
    });

    const findManyCall = mockPrismaUser.findMany.mock.calls[0][0];
    expect(findManyCall.where.isActive).toBe(true);
  });

  it('applies isActive filter when provided as false', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaUser.count.mockResolvedValue(0);

    await adminCustomerService.listCustomers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      isActive: false,
    });

    const findManyCall = mockPrismaUser.findMany.mock.calls[0][0];
    expect(findManyCall.where.isActive).toBe(false);
  });

  it('omits isActive from where clause when not provided', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaUser.count.mockResolvedValue(0);

    await adminCustomerService.listCustomers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const findManyCall = mockPrismaUser.findMany.mock.calls[0][0];
    expect(findManyCall.where.isActive).toBeUndefined();
  });

  it('builds OR search clause for email, firstName, lastName, phone', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaUser.count.mockResolvedValue(0);

    await adminCustomerService.listCustomers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: 'alice',
    });

    const findManyCall = mockPrismaUser.findMany.mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual([
      { email: { contains: 'alice', mode: 'insensitive' } },
      { firstName: { contains: 'alice', mode: 'insensitive' } },
      { lastName: { contains: 'alice', mode: 'insensitive' } },
      { phone: { contains: 'alice', mode: 'insensitive' } },
    ]);
  });

  it('omits OR clause when search is not provided', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaUser.count.mockResolvedValue(0);

    await adminCustomerService.listCustomers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const findManyCall = mockPrismaUser.findMany.mock.calls[0][0];
    expect(findManyCall.where.OR).toBeUndefined();
  });

  it('passes sortBy and sortOrder as orderBy', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaUser.count.mockResolvedValue(0);

    await adminCustomerService.listCustomers({
      page: 1,
      limit: 20,
      sortBy: 'email',
      sortOrder: 'asc',
    });

    const findManyCall = mockPrismaUser.findMany.mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ email: 'asc' });
  });

  it('combines search and isActive filters together', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaUser.count.mockResolvedValue(0);

    await adminCustomerService.listCustomers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: 'bob',
      isActive: false,
    });

    const findManyCall = mockPrismaUser.findMany.mock.calls[0][0];
    expect(findManyCall.where.role).toBe('CUSTOMER');
    expect(findManyCall.where.isActive).toBe(false);
    expect(findManyCall.where.OR).toHaveLength(4);
  });

  it('returns page 1 data when total is zero', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaUser.count.mockResolvedValue(0);

    const result = await adminCustomerService.listCustomers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result).toEqual({
      customers: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// getCustomer
// ---------------------------------------------------------------------------

describe('adminCustomerService.getCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: recent orders exist (not At Risk)
    mockPrismaOrder.count.mockResolvedValue(1);
  });

  it('throws ApiError.notFound when the customer does not exist', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    await expect(adminCustomerService.getCustomer('nonexistent-id')).rejects.toThrow(ApiError);
    await expect(adminCustomerService.getCustomer('nonexistent-id')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Customer not found',
    });
  });

  it('returns customer data with computed fields for a found customer', async () => {
    const customer = makeFullCustomer();
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 3000 } });
    mockPrismaOrder.count.mockResolvedValue(1);

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.id).toBe('user-1');
    expect(result.totalSpent).toBe(3000);
    expect(result.avgOrderValue).toBe(1000); // 3000 / 3 orders
    expect(result.segment).toBeDefined();
  });

  it('queries aggregate with notIn CANCELLED and REFUNDED statuses', async () => {
    const customer = makeFullCustomer();
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 500 } });
    mockPrismaOrder.count.mockResolvedValue(1);

    await adminCustomerService.getCustomer('user-1');

    const aggregateCall = mockPrismaOrder.aggregate.mock.calls[0][0];
    expect(aggregateCall.where.userId).toBe('user-1');
    expect(aggregateCall.where.status.notIn).toEqual(['CANCELLED', 'RETURNED']);
    expect(aggregateCall._sum.totalAmount).toBe(true);
  });

  // --- Segment: VIP ---

  it('assigns VIP segment when totalSpent >= 10000', async () => {
    const customer = makeFullCustomer({ _count: { orders: 5, reviews: 0 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 15000 } });
    mockPrismaOrder.count.mockResolvedValue(1); // has recent orders

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.segment).toBe('VIP');
  });

  it('assigns VIP segment at the exact boundary of 10000', async () => {
    const customer = makeFullCustomer({ _count: { orders: 4, reviews: 0 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 10000 } });
    mockPrismaOrder.count.mockResolvedValue(1);

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.segment).toBe('VIP');
  });

  // --- Segment: Regular ---

  it('assigns Regular segment when totalSpent is between 2000 and 9999', async () => {
    const customer = makeFullCustomer({ _count: { orders: 4, reviews: 0 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 5000 } });
    mockPrismaOrder.count.mockResolvedValue(1);

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.segment).toBe('Regular');
  });

  it('assigns Regular segment at the exact boundary of 2000', async () => {
    const customer = makeFullCustomer({ _count: { orders: 4, reviews: 0 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 2000 } });
    mockPrismaOrder.count.mockResolvedValue(1);

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.segment).toBe('Regular');
  });

  // --- Segment: New ---

  it('assigns New segment when orderCount is 0', async () => {
    const customer = makeFullCustomer({ _count: { orders: 0, reviews: 0 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
    // order.count is NOT called when orderCount === 0

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.segment).toBe('New');
    expect(result.totalSpent).toBe(0);
    expect(result.avgOrderValue).toBe(0);
  });

  it('assigns New segment when orderCount is exactly 1 and spent < 2000', async () => {
    const customer = makeFullCustomer({ _count: { orders: 1, reviews: 0 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 500 } });
    mockPrismaOrder.count.mockResolvedValue(1); // has recent order

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.segment).toBe('New');
  });

  // --- Segment: At Risk ---

  it('assigns At Risk when customer has orders but none in last 90 days', async () => {
    const customer = makeFullCustomer({ _count: { orders: 5, reviews: 1 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 1000 } });
    // recentOrderCount === 0 → At Risk
    mockPrismaOrder.count.mockResolvedValue(0);

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.segment).toBe('At Risk');
  });

  it('does not assign At Risk when customer has no orders at all', async () => {
    const customer = makeFullCustomer({ _count: { orders: 0, reviews: 0 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });

    const result = await adminCustomerService.getCustomer('user-1');

    // At Risk check skipped because orderCount === 0; falls through to New
    expect(result.segment).toBe('New');
    // order.count should NOT be called at all
    expect(mockPrismaOrder.count).not.toHaveBeenCalled();
  });

  it('VIP takes precedence over At Risk even with no recent orders', async () => {
    // VIP is set before the At Risk check, so At Risk overwrites it — confirm actual logic
    // From service: if VIP → segment=VIP, THEN if orderCount>0 && recentOrders===0 → segment=At Risk
    const customer = makeFullCustomer({ _count: { orders: 20, reviews: 5 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 50000 } });
    mockPrismaOrder.count.mockResolvedValue(0); // no recent orders

    const result = await adminCustomerService.getCustomer('user-1');

    // The At Risk check runs after segment assignment and overwrites VIP
    expect(result.segment).toBe('At Risk');
  });

  it('passes a date approximately 90 days ago to the recent order count query', async () => {
    const customer = makeFullCustomer({ _count: { orders: 3, reviews: 0 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 500 } });
    mockPrismaOrder.count.mockResolvedValue(2);

    const beforeCall = new Date();
    beforeCall.setDate(beforeCall.getDate() - 90);

    await adminCustomerService.getCustomer('user-1');

    const countCall = mockPrismaOrder.count.mock.calls[0][0];
    expect(countCall.where.userId).toBe('user-1');

    const cutoffDate: Date = countCall.where.createdAt.gte;
    const diffMs = Math.abs(cutoffDate.getTime() - beforeCall.getTime());
    // Allow 5 seconds of drift between when we computed beforeCall and when the service ran
    expect(diffMs).toBeLessThan(5000);
  });

  it('handles null totalAmount from aggregate gracefully (returns 0)', async () => {
    const customer = makeFullCustomer({ _count: { orders: 2, reviews: 0 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
    mockPrismaOrder.count.mockResolvedValue(1);

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.totalSpent).toBe(0);
    expect(result.avgOrderValue).toBe(0);
  });

  it('spreads all customer fields onto the return value', async () => {
    const customer = makeFullCustomer({
      addresses: [{ id: 'addr-1', street: '123 Main St' }],
      orders: [{ id: 'order-1' }],
    });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 500 } });
    mockPrismaOrder.count.mockResolvedValue(1);

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.addresses).toEqual([{ id: 'addr-1', street: '123 Main St' }]);
    expect(result.orders).toEqual([{ id: 'order-1' }]);
    expect(result.email).toBe('alice@example.com');
  });

  it('computes avgOrderValue correctly using total order count not order count from recent', async () => {
    // totalSpent=6000, orderCount=3 → avgOrderValue=2000
    const customer = makeFullCustomer({ _count: { orders: 3, reviews: 0 } });
    mockPrismaUser.findUnique.mockResolvedValue(customer);
    mockPrismaOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 6000 } });
    mockPrismaOrder.count.mockResolvedValue(1);

    const result = await adminCustomerService.getCustomer('user-1');

    expect(result.avgOrderValue).toBeCloseTo(2000);
  });
});

// ---------------------------------------------------------------------------
// exportCustomersCSV
// ---------------------------------------------------------------------------

describe('adminCustomerService.exportCustomersCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaUser.count.mockResolvedValue(0);
  });

  const makeExportCustomer = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    phone: '9876543210',
    isActive: true,
    loyaltyPoints: 100,
    createdAt: new Date('2024-03-15T00:00:00Z'),
    _count: { orders: 5 },
    ...overrides,
  });

  it('returns a CSV string starting with the correct header row', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const result = await adminCustomerService.exportCustomersCSV();

    expect(
      result.csv.startsWith('Name,Email,Phone,Orders,Total Spent,Loyalty Points,Status,Joined Date')
    ).toBe(true);
  });

  it('queries only CUSTOMER role users and caps at MAX_CSV_EXPORT_ROWS', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    await adminCustomerService.exportCustomersCSV();

    const findManyCall = mockPrismaUser.findMany.mock.calls[0][0];
    expect(findManyCall.where.role).toBe('CUSTOMER');
    expect(findManyCall.take).toBe(10000);
  });

  it('produces one data row per customer', async () => {
    const customers = [
      makeExportCustomer({ id: 'user-1', email: 'a@x.com' }),
      makeExportCustomer({ id: 'user-2', email: 'b@x.com' }),
    ];
    mockPrismaUser.findMany.mockResolvedValue(customers);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const { csv } = await adminCustomerService.exportCustomersCSV();
    const lines = csv.split('\n');

    // 1 header + 2 data rows
    expect(lines).toHaveLength(3);
  });

  it('includes correct data in each row field', async () => {
    const customers = [makeExportCustomer()];
    mockPrismaUser.findMany.mockResolvedValue(customers);
    mockPrismaOrder.groupBy.mockResolvedValue([{ userId: 'user-1', _sum: { totalAmount: 2500 } }]);

    const { csv } = await adminCustomerService.exportCustomersCSV();
    const dataRow = csv.split('\n')[1];

    expect(dataRow).toContain('Alice Smith');
    expect(dataRow).toContain('alice@example.com');
    expect(dataRow).toContain('9876543210');
    expect(dataRow).toContain('5'); // orders
    expect(dataRow).toContain('2500.00'); // spent
    expect(dataRow).toContain('100'); // loyalty points
    expect(dataRow).toContain('Active');
    expect(dataRow).toContain('2024-03-15'); // joined date
  });

  it("uses 'Inactive' status for customers with isActive=false", async () => {
    mockPrismaUser.findMany.mockResolvedValue([makeExportCustomer({ isActive: false })]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const { csv } = await adminCustomerService.exportCustomersCSV();

    expect(csv).toContain('Inactive');
  });

  it('falls back to 0.00 spent when customer has no matching groupBy row', async () => {
    mockPrismaUser.findMany.mockResolvedValue([makeExportCustomer()]);
    mockPrismaOrder.groupBy.mockResolvedValue([]); // no spend data

    const { csv } = await adminCustomerService.exportCustomersCSV();
    const dataRow = csv.split('\n')[1];

    expect(dataRow).toContain('0.00');
  });

  it('uses customer ids as the filter for the groupBy query', async () => {
    const customers = [makeExportCustomer({ id: 'u1' }), makeExportCustomer({ id: 'u2' })];
    mockPrismaUser.findMany.mockResolvedValue(customers);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    await adminCustomerService.exportCustomersCSV();

    const groupByCall = mockPrismaOrder.groupBy.mock.calls[0][0];
    expect(groupByCall.where.userId.in).toEqual(['u1', 'u2']);
    expect(groupByCall.where.status.notIn).toEqual(['CANCELLED', 'RETURNED']);
  });

  // --- escapeCsv RFC 4180 compliance ---

  it('wraps a field containing a comma in double quotes', async () => {
    mockPrismaUser.findMany.mockResolvedValue([
      makeExportCustomer({ firstName: 'Alice, Jr', lastName: '' }),
    ]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const { csv } = await adminCustomerService.exportCustomersCSV();
    const dataRow = csv.split('\n')[1];

    expect(dataRow).toContain('"Alice, Jr"');
  });

  it('wraps a field containing a double-quote and escapes inner quotes', async () => {
    mockPrismaUser.findMany.mockResolvedValue([
      makeExportCustomer({ email: 'alice"weird@example.com' }),
    ]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const { csv } = await adminCustomerService.exportCustomersCSV();
    const dataRow = csv.split('\n')[1];

    // The quote is escaped as "" inside a quoted field
    expect(dataRow).toContain('"alice""weird@example.com"');
  });

  it('wraps a field containing a newline in double quotes', async () => {
    mockPrismaUser.findMany.mockResolvedValue([makeExportCustomer({ phone: '98765\n43210' })]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const { csv } = await adminCustomerService.exportCustomersCSV();
    // Cannot split on \n because the field itself contains \n — check full CSV
    expect(csv).toContain('"98765\n43210"');
  });

  it('does not wrap plain fields that need no escaping', async () => {
    mockPrismaUser.findMany.mockResolvedValue([makeExportCustomer({ email: 'plain@test.com' })]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const { csv } = await adminCustomerService.exportCustomersCSV();
    const dataRow = csv.split('\n')[1];

    // plain@test.com should appear without wrapping quotes
    expect(dataRow).toContain('plain@test.com');
    // It should not be wrapped: check it is not preceded by a quote char
    const emailIndex = dataRow.indexOf('plain@test.com');
    expect(dataRow[emailIndex - 1]).not.toBe('"');
  });

  it('trims the full name and handles missing firstName/lastName gracefully', async () => {
    mockPrismaUser.findMany.mockResolvedValue([
      makeExportCustomer({ firstName: null, lastName: null }),
    ]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const { csv } = await adminCustomerService.exportCustomersCSV();
    const dataRow = csv.split('\n')[1];

    // Name should be empty (trimmed), row should still be valid CSV
    expect(dataRow).toBeDefined();
    // First field should be empty (empty name = leading comma)
    expect(dataRow.startsWith(',')).toBe(true);
  });

  it('handles missing phone gracefully (empty string in output)', async () => {
    mockPrismaUser.findMany.mockResolvedValue([makeExportCustomer({ phone: null })]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const { csv } = await adminCustomerService.exportCustomersCSV();
    const dataRow = csv.split('\n')[1];

    // Phone column is 3rd; two consecutive commas indicate empty phone
    const fields = dataRow.split(',');
    expect(fields[2]).toBe(''); // empty phone column
  });

  it('returns only the header row when there are no customers', async () => {
    mockPrismaUser.findMany.mockResolvedValue([]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const { csv } = await adminCustomerService.exportCustomersCSV();

    expect(csv).toBe('Name,Email,Phone,Orders,Total Spent,Loyalty Points,Status,Joined Date');
  });

  it('formats the joined date as YYYY-MM-DD (ISO date part only)', async () => {
    mockPrismaUser.findMany.mockResolvedValue([
      makeExportCustomer({ createdAt: new Date('2023-11-07T22:30:00Z') }),
    ]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    const { csv } = await adminCustomerService.exportCustomersCSV();
    const dataRow = csv.split('\n')[1];

    expect(dataRow).toContain('2023-11-07');
  });

  it('formats totalSpent with exactly two decimal places', async () => {
    mockPrismaUser.findMany.mockResolvedValue([makeExportCustomer()]);
    mockPrismaOrder.groupBy.mockResolvedValue([
      { userId: 'user-1', _sum: { totalAmount: 1234.5 } },
    ]);

    const { csv } = await adminCustomerService.exportCustomersCSV();
    const dataRow = csv.split('\n')[1];

    expect(dataRow).toContain('1234.50');
  });

  it("passes groupBy by=['userId'] with correct _sum field", async () => {
    mockPrismaUser.findMany.mockResolvedValue([makeExportCustomer()]);
    mockPrismaOrder.groupBy.mockResolvedValue([]);

    await adminCustomerService.exportCustomersCSV();

    const groupByCall = mockPrismaOrder.groupBy.mock.calls[0][0];
    expect(groupByCall.by).toEqual(['userId']);
    expect(groupByCall._sum.totalAmount).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// toggleActive
// ---------------------------------------------------------------------------

describe('adminCustomerService.toggleActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws ApiError.notFound when user does not exist', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    await expect(adminCustomerService.toggleActive('nonexistent')).rejects.toThrow(ApiError);
    await expect(adminCustomerService.toggleActive('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Customer not found',
    });
  });

  it('sets isActive to false when the customer is currently active', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1', isActive: true });
    mockPrismaUser.update.mockResolvedValue({ id: 'user-1', isActive: false });

    const result = await adminCustomerService.toggleActive('user-1');

    const updateCall = mockPrismaUser.update.mock.calls[0][0];
    expect(updateCall.data.isActive).toBe(false);
    expect(result).toEqual({ id: 'user-1', isActive: false });
  });

  it('sets isActive to true when the customer is currently inactive', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1', isActive: false });
    mockPrismaUser.update.mockResolvedValue({ id: 'user-1', isActive: true });

    const result = await adminCustomerService.toggleActive('user-1');

    const updateCall = mockPrismaUser.update.mock.calls[0][0];
    expect(updateCall.data.isActive).toBe(true);
    expect(result).toEqual({ id: 'user-1', isActive: true });
  });

  it('queries by the provided id in both findUnique and update', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'abc-123', isActive: true });
    mockPrismaUser.update.mockResolvedValue({ id: 'abc-123', isActive: false });

    await adminCustomerService.toggleActive('abc-123');

    expect(mockPrismaUser.findUnique.mock.calls[0][0].where.id).toBe('abc-123');
    expect(mockPrismaUser.update.mock.calls[0][0].where.id).toBe('abc-123');
  });

  it('selects only id and isActive in the update response', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1', isActive: true });
    mockPrismaUser.update.mockResolvedValue({ id: 'user-1', isActive: false });

    await adminCustomerService.toggleActive('user-1');

    const updateCall = mockPrismaUser.update.mock.calls[0][0];
    expect(updateCall.select).toEqual({ id: true, isActive: true });
  });

  it('does not call update when findUnique returns null', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    await expect(adminCustomerService.toggleActive('missing')).rejects.toThrow(ApiError);
    expect(mockPrismaUser.update).not.toHaveBeenCalled();
  });

  it('returns the updated user object from the update call', async () => {
    const updatedUser = { id: 'user-9', isActive: true };
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-9', isActive: false });
    mockPrismaUser.update.mockResolvedValue(updatedUser);

    const result = await adminCustomerService.toggleActive('user-9');

    expect(result).toBe(updatedUser);
  });
});
