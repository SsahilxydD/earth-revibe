# Phase 5: Cart & Checkout - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete cart-to-checkout flow — API endpoints for cart sync, addresses, orders, discount validation, and Razorpay payment. Storefront cart drawer, checkout multi-step flow, and order confirmation page.

**Architecture:** Cart works in two modes: guest cart (Zustand persisted in localStorage, already built) and authenticated cart (synced to server via API). Checkout requires authentication. Orders are created with address selection, optional discount code, and Razorpay payment integration. Razorpay creates an order on their side, frontend opens Razorpay checkout modal, backend verifies the payment signature.

**Tech Stack:** Express 5, Prisma 5, Zod 4, Razorpay Node SDK, Next.js 16, React 19, Tailwind CSS 4, TanStack Query 5, Zustand 5, react-hook-form 7

**API Base:** `http://localhost:5000/api/v1`

**Existing Relevant Code:**
- `packages/shared/src/schemas/cart.schema.ts` — `addToCartSchema`, `updateCartItemSchema`
- `packages/shared/src/schemas/order.schema.ts` — `createOrderSchema`, `verifyPaymentSchema`, `cancelOrderSchema`
- `packages/shared/src/schemas/user.schema.ts` — `addressSchema` (AddressInput)
- `packages/shared/src/schemas/discount.schema.ts` — `validateDiscountSchema`
- `packages/shared/src/enums/order.enum.ts` — `OrderStatus`
- `packages/shared/src/enums/payment.enum.ts` — `PaymentStatus`, `PaymentMethod`
- `packages/shared/src/constants/states.ts` — `INDIAN_STATES`
- `packages/shared/src/utils/order.ts` — `generateOrderNumber`
- `apps/storefront/src/stores/cart-store.ts` — Zustand cart (guest mode, already built)
- `apps/storefront/src/components/product/add-to-cart.tsx` — AddToCart button (already built)
- `apps/storefront/src/components/layout/header.tsx` — Has cart icon with badge + toggleCart()
- Prisma models: Cart, CartItem, Order, OrderItem, Payment, Address, DiscountCode

**Razorpay Integration Notes:**
- Install `razorpay` package in API app
- Razorpay creates an "order" with amount, backend stores `razorpayOrderId`
- Frontend opens Razorpay checkout modal (script tag loaded dynamically)
- On payment success, frontend sends `razorpayOrderId + razorpayPaymentId + razorpaySignature` to backend
- Backend verifies signature using `crypto.createHmac('sha256', secret)` and captures payment
- Environment vars needed: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

---

### Task 1: Install Razorpay SDK + Add Env Vars

Install the Razorpay Node SDK in the API app and add Razorpay config to environment variables.

**Files to modify:**
- `apps/api/package.json` — Add `razorpay` dependency
- `apps/api/src/config/env.ts` — Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

**Steps:**
1. Run `cd apps/api && pnpm add razorpay`
2. Read `apps/api/src/config/env.ts` and add Razorpay env vars with dev defaults

**Modify: `apps/api/src/config/env.ts`**

Add to the Zod schema:
```typescript
RAZORPAY_KEY_ID: z.string().default("rzp_test_placeholder"),
RAZORPAY_KEY_SECRET: z.string().default("test_secret_placeholder"),
```

---

### Task 2: API — Cart Endpoints

Server-side cart for authenticated users. Cart syncs with the DB so it persists across devices.

**Endpoints:**
- `GET /cart` — Get user's cart with items + variant details
- `POST /cart/items` — Add item to cart (variantId, quantity)
- `PUT /cart/items/:variantId` — Update item quantity
- `DELETE /cart/items/:variantId` — Remove item from cart
- `DELETE /cart` — Clear entire cart

**Files to create:**
- `apps/api/src/services/cart.service.ts`
- `apps/api/src/controllers/cart.controller.ts`
- `apps/api/src/routes/cart.routes.ts`

**File to modify:**
- `apps/api/src/app.ts` — Mount cart routes

**File: `apps/api/src/services/cart.service.ts`**

```typescript
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { AddToCartInput, UpdateCartItemInput } from "@earth-revibe/shared";

export const cartService = {
  async getCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    price: true,
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      price: true,
                      images: { where: { isPrimary: true }, take: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    return cart;
  },

  async addItem(userId: string, data: AddToCartInput) {
    // Verify variant exists and is in stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: data.variantId },
      include: { product: { select: { status: true } } },
    });

    if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") {
      throw ApiError.badRequest("Product variant not available");
    }

    if (variant.stock < data.quantity) {
      throw ApiError.badRequest(`Only ${variant.stock} items available`);
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    // Upsert cart item
    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: data.variantId } },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + data.quantity;
      if (newQty > variant.stock) {
        throw ApiError.badRequest(`Only ${variant.stock} items available`);
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: data.variantId,
          quantity: data.quantity,
        },
      });
    }

    return this.getCart(userId);
  },

  async updateItem(userId: string, variantId: string, data: UpdateCartItemInput) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw ApiError.notFound("Cart not found");

    const item = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });
    if (!item) throw ApiError.notFound("Item not in cart");

    // Check stock
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (variant && data.quantity > variant.stock) {
      throw ApiError.badRequest(`Only ${variant.stock} items available`);
    }

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: data.quantity },
    });

    return this.getCart(userId);
  },

  async removeItem(userId: string, variantId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw ApiError.notFound("Cart not found");

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, variantId },
    });

    return this.getCart(userId);
  },

  async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  },
};
```

**File: `apps/api/src/controllers/cart.controller.ts`**

```typescript
import type { Request, Response } from "express";
import { cartService } from "../services/cart.service";

export const cartController = {
  async getCart(req: Request, res: Response) {
    const cart = await cartService.getCart(req.user!.id);
    res.json({ success: true, data: cart });
  },

  async addItem(req: Request, res: Response) {
    const cart = await cartService.addItem(req.user!.id, req.body);
    res.json({ success: true, data: cart });
  },

  async updateItem(req: Request, res: Response) {
    const cart = await cartService.updateItem(
      req.user!.id,
      req.params.variantId as string,
      req.body
    );
    res.json({ success: true, data: cart });
  },

  async removeItem(req: Request, res: Response) {
    const cart = await cartService.removeItem(
      req.user!.id,
      req.params.variantId as string
    );
    res.json({ success: true, data: cart });
  },

  async clearCart(req: Request, res: Response) {
    await cartService.clearCart(req.user!.id);
    res.json({ success: true, message: "Cart cleared" });
  },
};
```

**File: `apps/api/src/routes/cart.routes.ts`**

```typescript
import { Router, type IRouter } from "express";
import { cartController } from "../controllers/cart.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { addToCartSchema, updateCartItemSchema } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", asyncHandler(cartController.getCart));
router.post("/items", validate({ body: addToCartSchema }), asyncHandler(cartController.addItem));
router.put("/items/:variantId", validate({ body: updateCartItemSchema }), asyncHandler(cartController.updateItem));
router.delete("/items/:variantId", asyncHandler(cartController.removeItem));
router.delete("/", asyncHandler(cartController.clearCart));

export { router as cartRouter };
```

**Modify: `apps/api/src/app.ts`**

Add after the search route:
```typescript
import { cartRouter } from "./routes/cart.routes";
// ...
app.use("/api/v1/cart", cartRouter);
```

---

### Task 3: API — Address Endpoints

CRUD for user shipping addresses. Required for checkout.

**Endpoints:**
- `GET /addresses` — List user's addresses
- `POST /addresses` — Create address
- `PUT /addresses/:id` — Update address
- `DELETE /addresses/:id` — Delete address

**Files to create:**
- `apps/api/src/services/address.service.ts`
- `apps/api/src/controllers/address.controller.ts`
- `apps/api/src/routes/address.routes.ts`

**File to modify:**
- `apps/api/src/app.ts` — Mount address routes

**File: `apps/api/src/services/address.service.ts`**

```typescript
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { AddressInput } from "@earth-revibe/shared";

export const addressService = {
  async listAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  },

  async createAddress(userId: string, data: AddressInput) {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If first address, auto-set as default
    const count = await prisma.address.count({ where: { userId } });
    const isDefault = count === 0 ? true : data.isDefault;

    return prisma.address.create({
      data: {
        userId,
        label: data.label,
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        pinCode: data.pinCode,
        isDefault,
      },
    });
  },

  async updateAddress(userId: string, addressId: string, data: Partial<AddressInput>) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw ApiError.notFound("Address not found");

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.address.update({
      where: { id: addressId },
      data,
    });
  },

  async deleteAddress(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw ApiError.notFound("Address not found");

    await prisma.address.delete({ where: { id: addressId } });

    // If deleted address was default, make the first remaining address default
    if (address.isDefault) {
      const first = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      if (first) {
        await prisma.address.update({
          where: { id: first.id },
          data: { isDefault: true },
        });
      }
    }
  },
};
```

**File: `apps/api/src/controllers/address.controller.ts`**

```typescript
import type { Request, Response } from "express";
import { addressService } from "../services/address.service";

export const addressController = {
  async listAddresses(req: Request, res: Response) {
    const addresses = await addressService.listAddresses(req.user!.id);
    res.json({ success: true, data: addresses });
  },

  async createAddress(req: Request, res: Response) {
    const address = await addressService.createAddress(req.user!.id, req.body);
    res.status(201).json({ success: true, data: address });
  },

  async updateAddress(req: Request, res: Response) {
    const address = await addressService.updateAddress(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    res.json({ success: true, data: address });
  },

  async deleteAddress(req: Request, res: Response) {
    await addressService.deleteAddress(req.user!.id, req.params.id as string);
    res.json({ success: true, message: "Address deleted" });
  },
};
```

**File: `apps/api/src/routes/address.routes.ts`**

```typescript
import { Router, type IRouter } from "express";
import { addressController } from "../controllers/address.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { addressSchema } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", asyncHandler(addressController.listAddresses));
router.post("/", validate({ body: addressSchema }), asyncHandler(addressController.createAddress));
router.put("/:id", validate({ body: addressSchema.partial() }), asyncHandler(addressController.updateAddress));
router.delete("/:id", asyncHandler(addressController.deleteAddress));

export { router as addressRouter };
```

**Modify: `apps/api/src/app.ts`**

Add:
```typescript
import { addressRouter } from "./routes/address.routes";
// ...
app.use("/api/v1/addresses", addressRouter);
```

---

### Task 4: API — Order & Payment Endpoints

Create order from cart, integrate with Razorpay to create payment order, verify payment signature, and list user's orders.

**Endpoints:**
- `POST /orders` — Create order from cart (returns razorpayOrderId for frontend)
- `POST /orders/verify-payment` — Verify Razorpay signature and capture payment
- `GET /orders` — List user's orders (paginated)
- `GET /orders/:orderNumber` — Get single order details
- `POST /orders/:orderNumber/cancel` — Cancel order

**Files to create:**
- `apps/api/src/config/razorpay.ts`
- `apps/api/src/services/order.service.ts`
- `apps/api/src/controllers/order.controller.ts`
- `apps/api/src/routes/order.routes.ts`

**File to modify:**
- `apps/api/src/app.ts` — Mount order routes

**File: `apps/api/src/config/razorpay.ts`**

```typescript
import Razorpay from "razorpay";
import { env } from "./env";

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});
```

**File: `apps/api/src/services/order.service.ts`**

```typescript
import crypto from "crypto";
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import { razorpay } from "../config/razorpay";
import { env } from "../config/env";
import { generateOrderNumber } from "@earth-revibe/shared";
import type { CreateOrderInput, VerifyPaymentInput, OrderQuery, CancelOrderInput } from "@earth-revibe/shared";

export const orderService = {
  async createOrder(userId: string, data: CreateOrderInput) {
    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, name: true, price: true, images: { where: { isPrimary: true }, take: 1 } },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw ApiError.badRequest("Cart is empty");
    }

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: data.addressId, userId },
    });
    if (!address) throw ApiError.badRequest("Invalid address");

    // Calculate subtotal
    let subtotal = 0;
    const orderItems = cart.items.map((item) => {
      const unitPrice = Number(item.variant.price) || Number(item.variant.product.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        productName: item.variant.product.name,
        productImage: item.variant.product.images[0]?.url || null,
        variantSize: item.variant.size,
        variantColor: item.variant.color,
      };
    });

    // Apply discount code if provided
    let discountAmount = 0;
    let discountCodeId: string | null = null;

    if (data.discountCode) {
      const discount = await prisma.discountCode.findUnique({
        where: { code: data.discountCode },
      });

      if (!discount || !discount.isActive) {
        throw ApiError.badRequest("Invalid discount code");
      }

      if (discount.expiresAt < new Date() || discount.startsAt > new Date()) {
        throw ApiError.badRequest("Discount code has expired");
      }

      if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
        throw ApiError.badRequest("Discount code usage limit reached");
      }

      if (discount.minOrderValue && subtotal < Number(discount.minOrderValue)) {
        throw ApiError.badRequest(`Minimum order value is ₹${discount.minOrderValue}`);
      }

      // Calculate discount
      if (discount.type === "PERCENTAGE") {
        discountAmount = subtotal * (Number(discount.value) / 100);
        if (discount.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, Number(discount.maxDiscountAmount));
        }
      } else {
        discountAmount = Number(discount.value);
      }

      discountCodeId = discount.id;
    }

    // Apply loyalty points
    let loyaltyDiscount = 0;
    if (data.loyaltyPointsToUse > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.loyaltyPoints < data.loyaltyPointsToUse) {
        throw ApiError.badRequest("Insufficient loyalty points");
      }
      // 1 point = ₹1
      loyaltyDiscount = data.loyaltyPointsToUse;
    }

    // Calculate totals
    const shippingAmount = subtotal >= 999 ? 0 : 99; // Free shipping over ₹999
    const totalBeforeTax = subtotal - discountAmount - loyaltyDiscount + shippingAmount;
    const taxAmount = 0; // Inclusive pricing, no additional tax
    const totalAmount = Math.max(totalBeforeTax + taxAmount, 0);

    const orderNumber = generateOrderNumber();

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // Razorpay expects paise
      currency: "INR",
      receipt: orderNumber,
    });

    // Create order in DB
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        addressId: data.addressId,
        subtotal,
        discountAmount,
        shippingAmount,
        taxAmount,
        totalAmount,
        loyaltyPointsUsed: data.loyaltyPointsToUse,
        discountCodeId,
        items: {
          create: orderItems,
        },
        payment: {
          create: {
            razorpayOrderId: razorpayOrder.id,
            amount: totalAmount,
            status: "PENDING",
          },
        },
        statusHistory: {
          create: {
            status: "PLACED",
            note: "Order placed, awaiting payment",
          },
        },
      },
      include: {
        items: true,
        payment: true,
      },
    });

    // Update discount usage count
    if (discountCodeId) {
      await prisma.discountCode.update({
        where: { id: discountCodeId },
        data: { usageCount: { increment: 1 } },
      });
    }

    return {
      order,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      amount: totalAmount,
    };
  },

  async verifyPayment(userId: string, data: VerifyPaymentInput) {
    // Find the payment
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: data.razorpayOrderId },
      include: { order: true },
    });

    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.order.userId !== userId) throw ApiError.forbidden("Not your order");

    // Verify signature
    const body = data.razorpayOrderId + "|" + data.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== data.razorpaySignature) {
      // Mark payment as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: "Signature verification failed" },
      });
      throw ApiError.badRequest("Payment verification failed");
    }

    // Update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId: data.razorpayPaymentId,
        razorpaySignature: data.razorpaySignature,
        status: "CAPTURED",
        paidAt: new Date(),
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: payment.order.id },
      data: { status: "CONFIRMED" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: payment.order.id,
        status: "CONFIRMED",
        note: "Payment received",
      },
    });

    // Deduct stock
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: payment.order.id },
    });
    for (const item of orderItems) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Deduct loyalty points if used
    if (payment.order.loyaltyPointsUsed > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: payment.order.loyaltyPointsUsed } },
      });
    }

    // Earn loyalty points (1 point per ₹100 spent)
    const pointsEarned = Math.floor(Number(payment.order.totalAmount) / 100);
    if (pointsEarned > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: pointsEarned } },
      });
      await prisma.order.update({
        where: { id: payment.order.id },
        data: { loyaltyPointsEarned: pointsEarned },
      });
    }

    // Clear cart
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    return { orderNumber: payment.order.orderNumber, pointsEarned };
  },

  async listOrders(userId: string, query: OrderQuery) {
    const { status, page, limit } = query;
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          payment: { select: { status: true, method: true, paidAt: true } },
        },
      }),
      prisma.order.count({ where: where as any }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getOrder(userId: string, orderNumber: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payment: true,
        address: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
        discountCode: { select: { code: true, type: true, value: true } },
      },
    });

    if (!order) throw ApiError.notFound("Order not found");
    if (order.userId !== userId) throw ApiError.forbidden("Not your order");

    return order;
  },

  async cancelOrder(userId: string, orderNumber: string, data: CancelOrderInput) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { payment: true },
    });

    if (!order) throw ApiError.notFound("Order not found");
    if (order.userId !== userId) throw ApiError.forbidden("Not your order");

    const cancellableStatuses = ["PLACED", "CONFIRMED", "PROCESSING"];
    if (!cancellableStatuses.includes(order.status)) {
      throw ApiError.badRequest("Order cannot be cancelled at this stage");
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: "CANCELLED",
        note: data.reason,
        changedBy: userId,
      },
    });

    // Restore stock
    const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of items) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }

    // Restore loyalty points if used
    if (order.loyaltyPointsUsed > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: order.loyaltyPointsUsed } },
      });
    }

    // TODO: Initiate refund via Razorpay if payment was captured

    return { orderNumber: order.orderNumber };
  },
};
```

**File: `apps/api/src/controllers/order.controller.ts`**

```typescript
import type { Request, Response } from "express";
import { orderService } from "../services/order.service";

export const orderController = {
  async createOrder(req: Request, res: Response) {
    const result = await orderService.createOrder(req.user!.id, req.body);
    res.status(201).json({ success: true, data: result });
  },

  async verifyPayment(req: Request, res: Response) {
    const result = await orderService.verifyPayment(req.user!.id, req.body);
    res.json({ success: true, data: result });
  },

  async listOrders(req: Request, res: Response) {
    const result = await orderService.listOrders(req.user!.id, req.query as any);
    res.json({ success: true, data: result });
  },

  async getOrder(req: Request, res: Response) {
    const order = await orderService.getOrder(req.user!.id, req.params.orderNumber as string);
    res.json({ success: true, data: order });
  },

  async cancelOrder(req: Request, res: Response) {
    const result = await orderService.cancelOrder(
      req.user!.id,
      req.params.orderNumber as string,
      req.body
    );
    res.json({ success: true, data: result });
  },
};
```

**File: `apps/api/src/routes/order.routes.ts`**

```typescript
import { Router, type IRouter } from "express";
import { orderController } from "../controllers/order.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import {
  createOrderSchema,
  verifyPaymentSchema,
  orderQuerySchema,
  cancelOrderSchema,
} from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);

router.post("/", validate({ body: createOrderSchema }), asyncHandler(orderController.createOrder));
router.post("/verify-payment", validate({ body: verifyPaymentSchema }), asyncHandler(orderController.verifyPayment));
router.get("/", validate({ query: orderQuerySchema }), asyncHandler(orderController.listOrders));
router.get("/:orderNumber", asyncHandler(orderController.getOrder));
router.post("/:orderNumber/cancel", validate({ body: cancelOrderSchema }), asyncHandler(orderController.cancelOrder));

export { router as orderRouter };
```

**Modify: `apps/api/src/app.ts`**

Add:
```typescript
import { orderRouter } from "./routes/order.routes";
// ...
app.use("/api/v1/orders", orderRouter);
```

---

### Task 5: API — Discount Validation Endpoint

Validate a discount code and return the discount amount for a given order total.

**Endpoints:**
- `POST /discounts/validate` — Validate discount code

**Files to create:**
- `apps/api/src/services/discount.service.ts`
- `apps/api/src/controllers/discount.controller.ts`
- `apps/api/src/routes/discount.routes.ts`

**File to modify:**
- `apps/api/src/app.ts` — Mount discount routes

**File: `apps/api/src/services/discount.service.ts`**

```typescript
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { ValidateDiscountInput } from "@earth-revibe/shared";

export const discountService = {
  async validateDiscount(data: ValidateDiscountInput) {
    const discount = await prisma.discountCode.findUnique({
      where: { code: data.code },
    });

    if (!discount || !discount.isActive) {
      throw ApiError.badRequest("Invalid discount code");
    }

    const now = new Date();
    if (discount.startsAt > now || discount.expiresAt < now) {
      throw ApiError.badRequest("Discount code has expired");
    }

    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      throw ApiError.badRequest("Discount code usage limit reached");
    }

    if (discount.minOrderValue && data.orderTotal < Number(discount.minOrderValue)) {
      throw ApiError.badRequest(`Minimum order value is ₹${discount.minOrderValue}`);
    }

    // Calculate discount amount
    let discountAmount: number;
    if (discount.type === "PERCENTAGE") {
      discountAmount = data.orderTotal * (Number(discount.value) / 100);
      if (discount.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, Number(discount.maxDiscountAmount));
      }
    } else {
      discountAmount = Math.min(Number(discount.value), data.orderTotal);
    }

    return {
      valid: true,
      code: discount.code,
      type: discount.type,
      value: Number(discount.value),
      discountAmount: Math.round(discountAmount * 100) / 100,
      description: discount.description,
    };
  },
};
```

**File: `apps/api/src/controllers/discount.controller.ts`**

```typescript
import type { Request, Response } from "express";
import { discountService } from "../services/discount.service";

export const discountController = {
  async validateDiscount(req: Request, res: Response) {
    const result = await discountService.validateDiscount(req.body);
    res.json({ success: true, data: result });
  },
};
```

**File: `apps/api/src/routes/discount.routes.ts`**

```typescript
import { Router, type IRouter } from "express";
import { discountController } from "../controllers/discount.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { validateDiscountSchema } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);

router.post("/validate", validate({ body: validateDiscountSchema }), asyncHandler(discountController.validateDiscount));

export { router as discountRouter };
```

**Modify: `apps/api/src/app.ts`**

Add:
```typescript
import { discountRouter } from "./routes/discount.routes";
// ...
app.use("/api/v1/discounts", discountRouter);
```

---

### Task 6: Storefront — Cart Drawer

Slide-out cart drawer that opens when the cart icon is clicked. Shows items, quantity controls, subtotal, and proceed to checkout button. Uses the existing Zustand cart store.

**Files to create:**
- `apps/storefront/src/components/cart/cart-drawer.tsx`
- `apps/storefront/src/components/cart/cart-item.tsx`

**File to modify:**
- `apps/storefront/src/app/(shop)/layout.tsx` — Add CartDrawer component

**File: `apps/storefront/src/components/cart/cart-item.tsx`**

```typescript
"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@earth-revibe/shared";

interface CartItemProps {
  item: {
    variantId: string;
    productName: string;
    productSlug: string;
    productImage?: string;
    size: string;
    color: string;
    price: number;
    quantity: number;
  };
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="flex gap-3 py-4 border-b border-light-gray last:border-0">
      {/* Image */}
      <div className="w-20 h-20 bg-off-white rounded-lg overflow-hidden flex-shrink-0">
        {item.productImage ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-medium-gray text-xs">
            No image
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <Link
            href={`/products/${item.productSlug}`}
            className="text-sm font-medium text-charcoal hover:text-forest-green truncate"
          >
            {item.productName}
          </Link>
          <button
            onClick={() => removeItem(item.variantId)}
            className="p-0.5 text-medium-gray hover:text-error transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-medium-gray mt-0.5">
          {item.size} / {item.color}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border border-light-gray rounded">
            <button
              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
              className="p-1 text-charcoal hover:text-forest-green"
            >
              <Minus size={14} />
            </button>
            <span className="w-7 text-center text-xs font-medium">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
              className="p-1 text-charcoal hover:text-forest-green"
            >
              <Plus size={14} />
            </button>
          </div>
          <p className="text-sm font-medium text-charcoal">{formatPrice(item.price * item.quantity)}</p>
        </div>
      </div>
    </div>
  );
}
```

**File: `apps/storefront/src/components/cart/cart-drawer.tsx`**

```typescript
"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui";
import { CartItem } from "./cart-item";
import { formatPrice } from "@earth-revibe/shared";

export function CartDrawer() {
  const router = useRouter();
  const { items, isOpen, setCartOpen, getSubtotal } = useCartStore();

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
    },
    [setCartOpen]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  const handleCheckout = () => {
    setCartOpen(false);
    router.push("/checkout");
  };

  if (!isOpen) return null;

  const subtotal = getSubtotal();

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={() => setCartOpen(false)} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-gray">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-deep-earth" />
            <h2 className="text-lg font-semibold text-deep-earth">Your Cart</h2>
            <span className="text-sm text-medium-gray">({items.length} items)</span>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="p-1 rounded-md hover:bg-off-white transition-colors"
          >
            <X size={20} className="text-dark-gray" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag size={48} className="text-light-gray mb-4" />
              <p className="text-lg font-medium text-charcoal">Your cart is empty</p>
              <p className="text-sm text-medium-gray mt-1">Add some items to get started</p>
              <Button
                variant="secondary"
                className="mt-6"
                onClick={() => { setCartOpen(false); router.push("/products"); }}
              >
                Browse Products
              </Button>
            </div>
          ) : (
            items.map((item) => <CartItem key={item.variantId} item={item} />)
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-light-gray px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-charcoal">Subtotal</span>
              <span className="text-lg font-semibold text-deep-earth">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-medium-gray">Shipping calculated at checkout</p>
            <Button onClick={handleCheckout} className="w-full" size="lg">
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Modify: `apps/storefront/src/app/(shop)/layout.tsx`**

Add CartDrawer to the shop layout:

```typescript
import { Header, Footer, MobileBottomBar } from "@/components/layout";
import { CartDrawer } from "@/components/cart/cart-drawer";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileBottomBar />
      <CartDrawer />
    </>
  );
}
```

---

### Task 7: Storefront — Checkout Page

Multi-step checkout flow: 1) Select/add address, 2) Order review + discount code, 3) Pay with Razorpay. Requires authentication — redirects to login if not authenticated.

**Files to create:**
- `apps/storefront/src/app/(shop)/checkout/page.tsx`
- `apps/storefront/src/components/checkout/address-step.tsx`
- `apps/storefront/src/components/checkout/review-step.tsx`
- `apps/storefront/src/components/checkout/address-form.tsx`

**File: `apps/storefront/src/components/checkout/address-form.tsx`**

Modal form for adding a new address. Uses react-hook-form + Zod addressSchema.

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, type AddressInput, INDIAN_STATES } from "@earth-revibe/shared";
import { Button, Input, Modal } from "@/components/ui";

interface AddressFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddressInput) => Promise<void>;
  isSubmitting: boolean;
}

export function AddressForm({ isOpen, onClose, onSubmit, isSubmitting }: AddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema) as any,
    defaultValues: { label: "Home", isDefault: false },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Address" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" error={errors.fullName?.message} {...register("fullName")} />
          <Input label="Phone Number" placeholder="9876543210" error={errors.phone?.message} {...register("phone")} />
        </div>
        <Input label="Address Line 1" placeholder="House/Flat no., Street" error={errors.line1?.message} {...register("line1")} />
        <Input label="Address Line 2 (Optional)" placeholder="Landmark, Area" {...register("line2")} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="City" error={errors.city?.message} {...register("city")} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-charcoal">State</label>
            <select
              className="w-full px-4 py-3 h-11 rounded-lg border-[1.5px] border-light-gray bg-white text-charcoal text-sm outline-none focus:border-forest-green focus:ring-2 focus:ring-forest-green/20"
              {...register("state")}
            >
              <option value="">Select</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.state?.message && <p className="text-sm text-error">{errors.state.message}</p>}
          </div>
          <Input label="PIN Code" placeholder="400001" error={errors.pinCode?.message} {...register("pinCode")} />
        </div>
        <Input label="Label" placeholder="Home, Office, etc." error={errors.label?.message} {...register("label")} />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Save Address</Button>
        </div>
      </form>
    </Modal>
  );
}
```

**File: `apps/storefront/src/components/checkout/address-step.tsx`**

Shows saved addresses as selectable cards, plus an "Add new" button.

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Check } from "lucide-react";
import { Button, Card, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { AddressForm } from "./address-form";
import type { AddressInput } from "@earth-revibe/shared";

interface AddressStepProps {
  selectedAddressId: string | null;
  onSelect: (addressId: string) => void;
  onNext: () => void;
}

export function AddressStep({ selectedAddressId, onSelect, onNext }: AddressStepProps) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => api.get("/addresses"),
  });

  const createAddress = useMutation({
    mutationFn: (data: AddressInput) => api.post("/addresses", data),
    onSuccess: (newAddr: any) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      onSelect(newAddr.id);
      setIsFormOpen(false);
      toast.success("Address added");
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" className="text-forest-green" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-deep-earth">Shipping Address</h2>

      {!addresses?.length ? (
        <div className="text-center py-8">
          <MapPin size={40} className="mx-auto text-light-gray mb-3" />
          <p className="text-medium-gray mb-4">No saved addresses. Add one to continue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr: any) => (
            <div
              key={addr.id}
              onClick={() => onSelect(addr.id)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedAddressId === addr.id
                  ? "border-forest-green bg-forest-green/5"
                  : "border-light-gray hover:border-sage"
              }`}
            >
              {selectedAddressId === addr.id && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-forest-green rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
              <p className="text-xs font-semibold text-forest-green uppercase mb-1">{addr.label}</p>
              <p className="text-sm font-medium text-charcoal">{addr.fullName}</p>
              <p className="text-sm text-dark-gray mt-1">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
              <p className="text-sm text-dark-gray">{addr.city}, {addr.state} — {addr.pinCode}</p>
              <p className="text-sm text-medium-gray mt-1">{addr.phone}</p>
            </div>
          ))}
        </div>
      )}

      <Button variant="secondary" onClick={() => setIsFormOpen(true)}>
        <Plus size={18} />
        Add New Address
      </Button>

      {selectedAddressId && (
        <div className="flex justify-end">
          <Button onClick={onNext} size="lg">Continue to Review</Button>
        </div>
      )}

      <AddressForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (data) => { await createAddress.mutateAsync(data); }}
        isSubmitting={createAddress.isPending}
      />
    </div>
  );
}
```

**File: `apps/storefront/src/components/checkout/review-step.tsx`**

Order summary with cart items, discount code input, shipping cost, and total. Pay Now button opens Razorpay.

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { Button, Input, Card } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatPrice } from "@earth-revibe/shared";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface ReviewStepProps {
  addressId: string;
  onBack: () => void;
}

export function ReviewStep({ addressId, onBack }: ReviewStepProps) {
  const router = useRouter();
  const { items, getSubtotal, clearCart } = useCartStore();
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<{ code: string; discountAmount: number } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);

  const subtotal = getSubtotal();
  const shipping = subtotal >= 999 ? 0 : 99;
  const discountAmount = discount?.discountAmount || 0;
  const total = Math.max(subtotal - discountAmount + shipping, 0);

  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) return;
    setIsValidating(true);
    try {
      const result = await api.post("/discounts/validate", {
        code: discountCode.trim().toUpperCase(),
        orderTotal: subtotal,
      });
      setDiscount(result);
      toast.success(`Discount applied: -${formatPrice(result.discountAmount)}`);
    } catch (err: any) {
      toast.error(err.message || "Invalid discount code");
      setDiscount(null);
    } finally {
      setIsValidating(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    try {
      // Create order on backend
      const result = await api.post("/orders", {
        addressId,
        discountCode: discount?.code,
        loyaltyPointsToUse: 0,
      });

      // Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Payment gateway failed to load. Please try again.");
        setIsPlacing(false);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: result.razorpayKeyId,
        amount: Math.round(result.amount * 100),
        currency: "INR",
        name: "Earth Revibe",
        description: `Order Payment`,
        order_id: result.razorpayOrderId,
        handler: async (response: any) => {
          try {
            const verifyResult = await api.post("/orders/verify-payment", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clearCart();
            router.push(`/order-confirmation/${verifyResult.orderNumber}`);
          } catch (err: any) {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        modal: {
          ondismiss: () => {
            setIsPlacing(false);
            toast.warning("Payment cancelled");
          },
        },
        theme: {
          color: "#2D5016",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
      setIsPlacing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-deep-earth">Review Your Order</h2>

      {/* Order Items */}
      <Card>
        <h3 className="text-sm font-semibold text-charcoal mb-3">Items ({items.length})</h3>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.variantId} className="flex items-center justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium text-charcoal">{item.productName}</p>
                <p className="text-xs text-medium-gray">{item.size} / {item.color} × {item.quantity}</p>
              </div>
              <p className="font-medium text-charcoal">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Discount Code */}
      <Card>
        <h3 className="text-sm font-semibold text-charcoal mb-3">Discount Code</h3>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray" />
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder="Enter discount code"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border-[1.5px] border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-forest-green"
            />
          </div>
          <Button variant="secondary" onClick={handleValidateDiscount} isLoading={isValidating}>
            Apply
          </Button>
        </div>
        {discount && (
          <p className="text-sm text-success mt-2">
            Code &quot;{discount.code}&quot; applied — you save {formatPrice(discount.discountAmount)}
          </p>
        )}
      </Card>

      {/* Order Summary */}
      <Card>
        <h3 className="text-sm font-semibold text-charcoal mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-dark-gray">Subtotal</span>
            <span className="text-charcoal">{formatPrice(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>-{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-dark-gray">Shipping</span>
            <span className="text-charcoal">{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
          </div>
          {shipping > 0 && (
            <p className="text-xs text-medium-gray">Free shipping on orders over ₹999</p>
          )}
          <div className="border-t border-light-gray pt-2 flex justify-between">
            <span className="text-base font-semibold text-charcoal">Total</span>
            <span className="text-lg font-bold text-deep-earth">{formatPrice(total)}</span>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back to Address</Button>
        <Button onClick={handlePlaceOrder} isLoading={isPlacing} size="lg">
          Pay {formatPrice(total)}
        </Button>
      </div>
    </div>
  );
}
```

**File: `apps/storefront/src/app/(shop)/checkout/page.tsx`**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { Spinner } from "@/components/ui/spinner";
import { AddressStep } from "@/components/checkout/address-step";
import { ReviewStep } from "@/components/checkout/review-step";

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const [step, setStep] = useState<"address" | "review">("address");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/checkout");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" className="text-forest-green" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-deep-earth mb-2">Your cart is empty</h1>
        <p className="text-medium-gray">Add some items before checking out.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`flex items-center gap-1.5 text-sm font-medium ${step === "address" ? "text-forest-green" : "text-medium-gray"}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "address" ? "bg-forest-green text-white" : "bg-light-gray text-dark-gray"}`}>1</span>
          Address
        </div>
        <div className="w-8 h-px bg-light-gray" />
        <div className={`flex items-center gap-1.5 text-sm font-medium ${step === "review" ? "text-forest-green" : "text-medium-gray"}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "review" ? "bg-forest-green text-white" : "bg-light-gray text-dark-gray"}`}>2</span>
          Review & Pay
        </div>
      </div>

      {step === "address" && (
        <AddressStep
          selectedAddressId={selectedAddressId}
          onSelect={setSelectedAddressId}
          onNext={() => setStep("review")}
        />
      )}

      {step === "review" && selectedAddressId && (
        <ReviewStep
          addressId={selectedAddressId}
          onBack={() => setStep("address")}
        />
      )}
    </div>
  );
}
```

---

### Task 8: Storefront — Order Confirmation Page

Simple confirmation page shown after successful payment. Shows order number, thank you message, and link to view order details.

**Files to create:**
- `apps/storefront/src/app/(shop)/order-confirmation/[orderNumber]/page.tsx`

**File: `apps/storefront/src/app/(shop)/order-confirmation/[orderNumber]/page.tsx`**

```typescript
"use client";

import { use } from "react";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

export default function OrderConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-success" />
      </div>

      <h1 className="text-2xl font-semibold text-deep-earth mb-2">Order Placed!</h1>
      <p className="text-medium-gray mb-6">
        Thank you for your purchase. Your order has been confirmed.
      </p>

      <div className="bg-off-white rounded-xl p-6 mb-8">
        <p className="text-sm text-medium-gray mb-1">Order Number</p>
        <p className="text-xl font-bold text-charcoal">{orderNumber}</p>
        <p className="text-sm text-medium-gray mt-3">
          We&apos;ll send you an email with tracking details once your order ships.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href={`/account/orders`}>
          <Button variant="secondary">
            <Package size={18} />
            View My Orders
          </Button>
        </Link>
        <Link href="/products">
          <Button>
            Continue Shopping
            <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

---

### Task 9: Verify Build

Run `pnpm turbo build --filter=@earth-revibe/api --filter=@earth-revibe/storefront` and fix any TypeScript or build errors.

**Potential issues to watch for:**
1. `razorpay` package types — may need `@types/razorpay` or type assertions
2. Prisma Decimal fields — need `Number()` casts when doing arithmetic
3. `generateOrderNumber` import from `@earth-revibe/shared` — verify it's exported from utils
4. `addressSchema.partial()` in route validation — Zod 4 `.partial()` may behave differently, may need `as any`
5. `crypto` import in order.service.ts — built-in Node module, should work without install
6. Next.js 16 `params: Promise<{...}>` — use `use()` in client components
7. `window.Razorpay` type declaration — needs `declare global` block in review-step.tsx
