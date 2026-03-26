import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../../utils/api-error';

// ---------------------------------------------------------------------------
// Hoisted mock handles — must be declared before vi.mock() factory runs.
// ---------------------------------------------------------------------------
const { mockCart, mockCartItem, mockProductVariant } = vi.hoisted(() => ({
  mockCart: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  mockCartItem: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  mockProductVariant: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    cart: mockCart,
    cartItem: mockCartItem,
    productVariant: mockProductVariant,
  },
}));

import { cartService } from '../cart.service';

// ---------------------------------------------------------------------------
// Shared fixture factories — always create new objects (immutable pattern).
// ---------------------------------------------------------------------------
const makeCart = (overrides: Record<string, unknown> = {}) => ({
  id: 'cart-1',
  userId: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  items: [],
  ...overrides,
});

const makeVariant = (overrides: Record<string, unknown> = {}) => ({
  id: 'variant-1',
  isActive: true,
  stock: 10,
  product: { status: 'ACTIVE' },
  ...overrides,
});

const makeCartItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'item-1',
  cartId: 'cart-1',
  variantId: 'variant-1',
  quantity: 2,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

const USER_ID = 'user-1';
const VARIANT_ID = 'variant-1';

// ---------------------------------------------------------------------------
// Helper: reset every mock before each test so tests are fully independent.
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// getCart
// ===========================================================================
describe('cartService.getCart', () => {
  it('returns existing cart when one is found for the user', async () => {
    const cart = makeCart({ items: [makeCartItem()] });
    mockCart.findUnique.mockResolvedValue(cart);

    const result = await cartService.getCart(USER_ID);

    expect(mockCart.findUnique).toHaveBeenCalledOnce();
    expect(mockCart.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } })
    );
    expect(mockCart.create).not.toHaveBeenCalled();
    expect(result).toEqual(cart);
  });

  it('creates and returns a new cart when none exists for the user', async () => {
    const newCart = makeCart();
    mockCart.findUnique.mockResolvedValue(null);
    mockCart.create.mockResolvedValue(newCart);

    const result = await cartService.getCart(USER_ID);

    expect(mockCart.create).toHaveBeenCalledOnce();
    expect(mockCart.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: USER_ID } })
    );
    expect(result).toEqual(newCart);
  });

  it('queries with full nested include for items → variant → product → images', async () => {
    const cart = makeCart();
    mockCart.findUnique.mockResolvedValue(cart);

    await cartService.getCart(USER_ID);

    const callArg = mockCart.findUnique.mock.calls[0][0];
    expect(callArg.include).toBeDefined();
    expect(callArg.include.items.include.variant.include.product.select).toMatchObject({
      id: true,
      name: true,
      slug: true,
      price: true,
    });
    expect(callArg.include.items.include.variant.include.product.select.images).toMatchObject({
      where: { isPrimary: true },
      take: 1,
    });
  });

  it('returns an empty items array for a newly created cart', async () => {
    const newCart = makeCart({ items: [] });
    mockCart.findUnique.mockResolvedValue(null);
    mockCart.create.mockResolvedValue(newCart);

    const result = await cartService.getCart(USER_ID);

    expect(result.items).toEqual([]);
  });
});

// ===========================================================================
// addItem
// ===========================================================================
describe('cartService.addItem', () => {
  const addData = { variantId: VARIANT_ID, quantity: 2 };

  it('throws 400 when variant does not exist', async () => {
    mockProductVariant.findUnique.mockResolvedValue(null);

    await expect(cartService.addItem(USER_ID, addData)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Product variant not available',
    });
  });

  it('throws 400 when variant exists but isActive is false', async () => {
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ isActive: false }));

    await expect(cartService.addItem(USER_ID, addData)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Product variant not available',
    });
  });

  it('throws 400 when variant is active but product status is not ACTIVE', async () => {
    mockProductVariant.findUnique.mockResolvedValue(
      makeVariant({ product: { status: 'INACTIVE' } })
    );

    await expect(cartService.addItem(USER_ID, addData)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Product variant not available',
    });
  });

  it('throws 400 when variant is active but product status is DRAFT', async () => {
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ product: { status: 'DRAFT' } }));

    await expect(cartService.addItem(USER_ID, addData)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Product variant not available',
    });
  });

  it('throws 400 with stock message when requested quantity exceeds stock', async () => {
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 1 }));

    await expect(
      cartService.addItem(USER_ID, { variantId: VARIANT_ID, quantity: 5 })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Only 1 items available',
    });
  });

  it('throws 400 when requested quantity exactly equals stock plus one', async () => {
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 3 }));

    await expect(
      cartService.addItem(USER_ID, { variantId: VARIANT_ID, quantity: 4 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('creates cart when none exists before adding the first item', async () => {
    const cart = makeCart();
    const fullCart = makeCart({ items: [makeCartItem()] });
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 10 }));
    // First findUnique (addItem internal check) → no cart
    // Second findUnique (getCart call at end) → full cart
    mockCart.findUnique
      .mockResolvedValueOnce(null) // addItem: get or create
      .mockResolvedValue(fullCart); // getCart at end
    mockCart.create.mockResolvedValue(cart);
    mockCartItem.findUnique.mockResolvedValue(null);
    mockCartItem.create.mockResolvedValue(makeCartItem());

    await cartService.addItem(USER_ID, addData);

    expect(mockCart.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: USER_ID } })
    );
  });

  it('reuses existing cart when one exists before adding an item', async () => {
    const cart = makeCart();
    const fullCart = makeCart({ items: [makeCartItem()] });
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 10 }));
    mockCart.findUnique.mockResolvedValue(fullCart);
    mockCartItem.findUnique.mockResolvedValue(null);
    mockCartItem.create.mockResolvedValue(makeCartItem());
    // getCart call inside addItem also uses findUnique
    mockCart.findUnique.mockResolvedValue(cart);

    await cartService.addItem(USER_ID, addData);

    expect(mockCart.create).not.toHaveBeenCalled();
  });

  it('creates a new cart item when variant is not already in cart', async () => {
    const cart = makeCart();
    const fullCart = makeCart({ items: [makeCartItem()] });
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 10 }));
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.findUnique.mockResolvedValue(null);
    mockCartItem.create.mockResolvedValue(makeCartItem());

    await cartService.addItem(USER_ID, addData);

    expect(mockCartItem.create).toHaveBeenCalledWith({
      data: {
        cartId: cart.id,
        variantId: VARIANT_ID,
        quantity: 2,
      },
    });
    expect(mockCartItem.update).not.toHaveBeenCalled();
  });

  it('updates existing cart item quantity when variant already in cart (upsert)', async () => {
    const cart = makeCart();
    const existingItem = makeCartItem({ quantity: 3 });
    const fullCart = makeCart({ items: [makeCartItem({ quantity: 5 })] });
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 10 }));
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.findUnique.mockResolvedValue(existingItem);
    mockCartItem.update.mockResolvedValue({ ...existingItem, quantity: 5 });

    await cartService.addItem(USER_ID, { variantId: VARIANT_ID, quantity: 2 });

    // existing 3 + new 2 = 5
    expect(mockCartItem.update).toHaveBeenCalledWith({
      where: { id: existingItem.id },
      data: { quantity: 5 },
    });
    expect(mockCartItem.create).not.toHaveBeenCalled();
  });

  it('throws 400 when stacked quantity (existing + new) exceeds stock', async () => {
    const cart = makeCart();
    const existingItem = makeCartItem({ quantity: 8 });
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 10 }));
    mockCart.findUnique.mockResolvedValue(cart);
    mockCartItem.findUnique.mockResolvedValue(existingItem);

    // existing 8 + new 5 = 13, stock is 10
    await expect(
      cartService.addItem(USER_ID, { variantId: VARIANT_ID, quantity: 5 })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Only 10 items available',
    });

    expect(mockCartItem.update).not.toHaveBeenCalled();
  });

  it('allows adding when stacked quantity exactly equals stock', async () => {
    const cart = makeCart();
    const existingItem = makeCartItem({ quantity: 7 });
    const fullCart = makeCart({ items: [makeCartItem({ quantity: 10 })] });
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 10 }));
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.findUnique.mockResolvedValue(existingItem);
    mockCartItem.update.mockResolvedValue({ ...existingItem, quantity: 10 });

    // existing 7 + new 3 = 10 exactly, should not throw
    await expect(
      cartService.addItem(USER_ID, { variantId: VARIANT_ID, quantity: 3 })
    ).resolves.toBeDefined();
  });

  it('returns the full populated cart after adding an item', async () => {
    const cart = makeCart();
    const fullCart = makeCart({ items: [makeCartItem()] });
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 10 }));
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.findUnique.mockResolvedValue(null);
    mockCartItem.create.mockResolvedValue(makeCartItem());

    const result = await cartService.addItem(USER_ID, addData);

    expect(result).toEqual(fullCart);
  });

  it('throws errors that are instances of ApiError for invalid variant', async () => {
    mockProductVariant.findUnique.mockResolvedValue(null);

    const error = await cartService.addItem(USER_ID, addData).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('BAD_REQUEST');
  });
});

// ===========================================================================
// updateItem
// ===========================================================================
describe('cartService.updateItem', () => {
  const updateData = { quantity: 3 };

  it('throws 404 when cart does not exist for the user', async () => {
    mockCart.findUnique.mockResolvedValue(null);

    await expect(cartService.updateItem(USER_ID, VARIANT_ID, updateData)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Cart not found',
    });
  });

  it('throws 404 when the item is not in the cart', async () => {
    mockCart.findUnique.mockResolvedValue(makeCart());
    mockCartItem.findUnique.mockResolvedValue(null);

    await expect(cartService.updateItem(USER_ID, VARIANT_ID, updateData)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Item not in cart',
    });
  });

  it('throws 400 when new quantity exceeds available stock', async () => {
    mockCart.findUnique.mockResolvedValue(makeCart());
    mockCartItem.findUnique.mockResolvedValue(makeCartItem());
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 2 }));

    await expect(
      cartService.updateItem(USER_ID, VARIANT_ID, { quantity: 5 })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Only 2 items available',
    });

    expect(mockCartItem.update).not.toHaveBeenCalled();
  });

  it('allows updating when new quantity equals stock exactly', async () => {
    const cart = makeCart();
    const item = makeCartItem();
    const fullCart = makeCart({ items: [makeCartItem({ quantity: 5 })] });
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.findUnique.mockResolvedValue(item);
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 5 }));
    mockCartItem.update.mockResolvedValue({ ...item, quantity: 5 });

    await expect(
      cartService.updateItem(USER_ID, VARIANT_ID, { quantity: 5 })
    ).resolves.toBeDefined();
  });

  it('updates item quantity when all validations pass', async () => {
    const cart = makeCart();
    const item = makeCartItem({ id: 'item-99' });
    const fullCart = makeCart({ items: [makeCartItem({ quantity: 3 })] });
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.findUnique.mockResolvedValue(item);
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 10 }));
    mockCartItem.update.mockResolvedValue({ ...item, quantity: 3 });

    await cartService.updateItem(USER_ID, VARIANT_ID, updateData);

    expect(mockCartItem.update).toHaveBeenCalledWith({
      where: { id: item.id },
      data: { quantity: 3 },
    });
  });

  it('skips stock check and updates when variant is not found in DB', async () => {
    const cart = makeCart();
    const item = makeCartItem();
    const fullCart = makeCart({ items: [makeCartItem({ quantity: 3 })] });
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.findUnique.mockResolvedValue(item);
    // variant not found — service guards with `if (variant && ...)`
    mockProductVariant.findUnique.mockResolvedValue(null);
    mockCartItem.update.mockResolvedValue({ ...item, quantity: 999 });

    await expect(
      cartService.updateItem(USER_ID, VARIANT_ID, { quantity: 999 })
    ).resolves.toBeDefined();

    expect(mockCartItem.update).toHaveBeenCalled();
  });

  it('returns the full populated cart after a successful update', async () => {
    const cart = makeCart();
    const item = makeCartItem();
    const fullCart = makeCart({ items: [makeCartItem({ quantity: 3 })] });
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.findUnique.mockResolvedValue(item);
    mockProductVariant.findUnique.mockResolvedValue(makeVariant({ stock: 10 }));
    mockCartItem.update.mockResolvedValue({ ...item, quantity: 3 });

    const result = await cartService.updateItem(USER_ID, VARIANT_ID, updateData);

    expect(result).toEqual(fullCart);
  });

  it('cart findUnique is called with correct userId', async () => {
    mockCart.findUnique.mockResolvedValue(null);

    await cartService.updateItem('other-user', VARIANT_ID, updateData).catch(() => {});

    expect(mockCart.findUnique).toHaveBeenCalledWith({ where: { userId: 'other-user' } });
  });
});

// ===========================================================================
// removeItem
// ===========================================================================
describe('cartService.removeItem', () => {
  it('throws 404 when cart does not exist for the user', async () => {
    mockCart.findUnique.mockResolvedValue(null);

    await expect(cartService.removeItem(USER_ID, VARIANT_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Cart not found',
    });
  });

  it('deletes the item from the cart when cart exists', async () => {
    const cart = makeCart();
    const fullCart = makeCart({ items: [] });
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.deleteMany.mockResolvedValue({ count: 1 });

    await cartService.removeItem(USER_ID, VARIANT_ID);

    expect(mockCartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: cart.id, variantId: VARIANT_ID },
    });
  });

  it('returns the full cart (without the removed item) after removal', async () => {
    const cart = makeCart();
    const fullCart = makeCart({ items: [] });
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.deleteMany.mockResolvedValue({ count: 1 });

    const result = await cartService.removeItem(USER_ID, VARIANT_ID);

    expect(result).toEqual(fullCart);
  });

  it('does not throw when the item does not exist in cart (deleteMany is a no-op)', async () => {
    const cart = makeCart();
    const fullCart = makeCart({ items: [] });
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.deleteMany.mockResolvedValue({ count: 0 });

    await expect(cartService.removeItem(USER_ID, VARIANT_ID)).resolves.toBeDefined();
  });

  it('only removes items matching the given variantId, not all items', async () => {
    const cart = makeCart({ id: 'cart-99' });
    const fullCart = makeCart({ items: [] });
    mockCart.findUnique.mockResolvedValueOnce(cart).mockResolvedValue(fullCart);
    mockCartItem.deleteMany.mockResolvedValue({ count: 1 });

    await cartService.removeItem(USER_ID, 'specific-variant');

    expect(mockCartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 'cart-99', variantId: 'specific-variant' },
    });
  });
});

// ===========================================================================
// clearCart
// ===========================================================================
describe('cartService.clearCart', () => {
  it('deletes all items when a cart exists', async () => {
    const cart = makeCart({ id: 'cart-5' });
    mockCart.findUnique.mockResolvedValue(cart);
    mockCartItem.deleteMany.mockResolvedValue({ count: 3 });

    await cartService.clearCart(USER_ID);

    expect(mockCartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: cart.id },
    });
  });

  it('is a no-op when no cart exists (does not throw)', async () => {
    mockCart.findUnique.mockResolvedValue(null);

    await expect(cartService.clearCart(USER_ID)).resolves.toBeUndefined();

    expect(mockCartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('returns undefined after clearing the cart', async () => {
    const cart = makeCart();
    mockCart.findUnique.mockResolvedValue(cart);
    mockCartItem.deleteMany.mockResolvedValue({ count: 5 });

    const result = await cartService.clearCart(USER_ID);

    expect(result).toBeUndefined();
  });

  it("deletes items scoped only to the user's cart id", async () => {
    const cart = makeCart({ id: 'cart-xyz' });
    mockCart.findUnique.mockResolvedValue(cart);
    mockCartItem.deleteMany.mockResolvedValue({ count: 1 });

    await cartService.clearCart(USER_ID);

    expect(mockCartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 'cart-xyz' },
    });
  });

  it('looks up the cart by userId before attempting to clear', async () => {
    mockCart.findUnique.mockResolvedValue(null);

    await cartService.clearCart('targeted-user');

    expect(mockCart.findUnique).toHaveBeenCalledWith({
      where: { userId: 'targeted-user' },
    });
  });
});

// ===========================================================================
// Cross-cutting: ApiError shape
// ===========================================================================
describe('ApiError shape produced by cartService', () => {
  it('not-found errors have statusCode 404 and code NOT_FOUND', async () => {
    mockCart.findUnique.mockResolvedValue(null);

    const error = await cartService
      .updateItem(USER_ID, VARIANT_ID, { quantity: 1 })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('bad-request errors have statusCode 400 and code BAD_REQUEST', async () => {
    mockProductVariant.findUnique.mockResolvedValue(null);

    const error = await cartService
      .addItem(USER_ID, { variantId: VARIANT_ID, quantity: 1 })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
  });
});
