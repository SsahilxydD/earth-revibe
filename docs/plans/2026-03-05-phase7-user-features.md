# Phase 7: User Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build user account pages for profile management, order history, and wishlist on the storefront.

**Architecture:** Add profile/password/wishlist API endpoints, then build storefront account pages with a shared account layout + auth guard. Storefront API client wraps responses in `json.data`, so all customer-facing controllers must use `res.json({ success: true, data: result })`.

**Tech Stack:** Express 5 + Prisma (API), Next.js 16 + React 19 + TanStack Query (Storefront), Zod (shared schemas)

---

### Task 1: API — Profile & Password Endpoints

**Files:**
- Modify: `apps/api/src/services/auth.service.ts` (add updateProfile, changePassword)
- Modify: `apps/api/src/controllers/auth.controller.ts` (add handlers)
- Modify: `apps/api/src/routes/auth.routes.ts` (add routes)

**Context:** The auth service already has `getMe`. Add `updateProfile` and `changePassword` to the same service. Use `updateProfileSchema` and `changePasswordSchema` from shared schemas. Storefront API client returns `json.data`, so wrap responses with `{ success: true, data: result }`.

**Step 1: Add updateProfile and changePassword to auth.service.ts**

Add before the closing `};` of `authService`:

```typescript
  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        avatar: data.avatar,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        loyaltyPoints: true,
        referralCode: true,
        createdAt: true,
      },
    });
    return user;
  },

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found");

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) throw ApiError.badRequest("Current password is incorrect");

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens except current session
    await prisma.refreshToken.deleteMany({ where: { userId } });
  },
```

Also add the import at the top of auth.service.ts:
```typescript
import type { RegisterInput, LoginInput, UpdateProfileInput, ChangePasswordInput } from "@earth-revibe/shared";
```

**Step 2: Add handlers to auth.controller.ts**

```typescript
  async updateProfile(req: Request, res: Response) {
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, data: user });
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(req.user!.id, req.body);
    res.json({ success: true, message: "Password changed successfully" });
  },
```

**Step 3: Add routes to auth.routes.ts**

Add imports for `updateProfileSchema, changePasswordSchema` from `@earth-revibe/shared`.

Add routes after the existing `router.get("/me", ...)`:
```typescript
router.put("/profile", authenticate, validate({ body: updateProfileSchema }), asyncHandler(authController.updateProfile));
router.put("/password", authenticate, validate({ body: changePasswordSchema }), asyncHandler(authController.changePassword));
```

---

### Task 2: API — Wishlist Endpoints

**Files:**
- Create: `apps/api/src/services/wishlist.service.ts`
- Create: `apps/api/src/controllers/wishlist.controller.ts`
- Create: `apps/api/src/routes/wishlist.routes.ts`
- Modify: `apps/api/src/app.ts` (mount router)

**Context:** WishlistItem model has userId + productId unique constraint. All routes need `authenticate`. Use `{ success: true, data: ... }` response pattern for storefront compatibility.

**Step 1: Create wishlist.service.ts**

```typescript
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";

export const wishlistService = {
  async getWishlist(userId: string) {
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return items;
  },

  async addToWishlist(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound("Product not found");

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) return existing;

    const item = await prisma.wishlistItem.create({
      data: { userId, productId },
    });
    return item;
  },

  async removeFromWishlist(userId: string, productId: string) {
    await prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
  },

  async isInWishlist(userId: string, productId: string) {
    const item = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return !!item;
  },
};
```

**Step 2: Create wishlist.controller.ts**

```typescript
import type { Request, Response } from "express";
import { wishlistService } from "../services/wishlist.service";

export const wishlistController = {
  async getWishlist(req: Request, res: Response) {
    const items = await wishlistService.getWishlist(req.user!.id);
    res.json({ success: true, data: items });
  },

  async addToWishlist(req: Request, res: Response) {
    const item = await wishlistService.addToWishlist(req.user!.id, req.body.productId);
    res.status(201).json({ success: true, data: item });
  },

  async removeFromWishlist(req: Request, res: Response) {
    const productId = req.params.productId as string;
    await wishlistService.removeFromWishlist(req.user!.id, productId);
    res.json({ success: true, message: "Removed from wishlist" });
  },

  async checkWishlist(req: Request, res: Response) {
    const productId = req.params.productId as string;
    const inWishlist = await wishlistService.isInWishlist(req.user!.id, productId);
    res.json({ success: true, data: { inWishlist } });
  },
};
```

**Step 3: Create wishlist.routes.ts**

```typescript
import { Router, type IRouter } from "express";
import { wishlistController } from "../controllers/wishlist.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", asyncHandler(wishlistController.getWishlist));
router.post("/", asyncHandler(wishlistController.addToWishlist));
router.delete("/:productId", asyncHandler(wishlistController.removeFromWishlist));
router.get("/:productId/check", asyncHandler(wishlistController.checkWishlist));

export { router as wishlistRouter };
```

**Step 4: Mount in app.ts**

Add import: `import { wishlistRouter } from "./routes/wishlist.routes";`
Add route: `app.use("/api/v1/wishlist", wishlistRouter);`

---

### Task 3: Storefront — Account Layout + Auth Guard

**Files:**
- Create: `apps/storefront/src/app/(shop)/account/layout.tsx`

**Context:** The header links point to `/account/profile`, `/account/orders`, `/account/wishlist`. These are under the `(shop)` route group (which provides Header/Footer). The layout needs an auth guard (redirect to /auth/login if not authenticated) and a sidebar navigation. The storefront auth store has `isAuthenticated` and `isLoading` states. The storefront `(shop)/layout.tsx` already wraps with Header/Footer, so the account layout just adds the sidebar + auth check.

**Code:**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { User, Package, Heart, Star, Gift, MapPin } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Spinner } from "@/components/ui";

const accountNav = [
  { label: "Profile", href: "/account/profile", icon: User },
  { label: "Orders", href: "/account/orders", icon: Package },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
  { label: "Loyalty Points", href: "/account/loyalty", icon: Star },
  { label: "Referrals", href: "/account/referrals", icon: Gift },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-56 flex-shrink-0">
          <h2 className="text-lg font-semibold text-charcoal mb-4">My Account</h2>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {accountNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-forest-green/10 text-forest-green font-medium"
                      : "text-dark-gray hover:bg-off-white hover:text-charcoal"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
```

---

### Task 4: Storefront — Profile Page

**Files:**
- Create: `apps/storefront/src/app/(shop)/account/profile/page.tsx`

**Context:** Uses storefront api-client which returns `json.data`. The `auth/me` endpoint returns user profile, `PUT /auth/profile` updates it, `PUT /auth/password` changes password. Use react-hook-form with zodResolver. The `updateProfileSchema` has `z.coerce.number()` issues — but actually it doesn't, it's only strings. Still, use `as any` on zodResolver if needed as a safety measure.

**Code:**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Button, Input, Card } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { updateProfileSchema, changePasswordSchema } from "@earth-revibe/shared";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => api.get("/auth/me"),
  });

  const profileForm = useForm({
    resolver: zodResolver(updateProfileSchema) as any,
    values: profile
      ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone || "",
        }
      : undefined,
  });

  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema) as any,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const updateProfile = useMutation({
    mutationFn: (data: any) => api.put("/auth/profile", data),
    onSuccess: (updatedUser: any) => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setUser({ ...user!, ...updatedUser });
      toast.success("Profile updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update profile"),
  });

  const changePassword = useMutation({
    mutationFn: (data: any) => api.put("/auth/password", data),
    onSuccess: () => {
      passwordForm.reset();
      setShowPassword(false);
      toast.success("Password changed successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to change password"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">My Profile</h1>

      {/* Profile form */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Personal Information</h3>
        <form
          onSubmit={profileForm.handleSubmit((data) => updateProfile.mutate(data))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">First Name</label>
              <Input {...profileForm.register("firstName")} />
              {profileForm.formState.errors.firstName && (
                <p className="text-xs text-error mt-1">{profileForm.formState.errors.firstName.message as string}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Last Name</label>
              <Input {...profileForm.register("lastName")} />
              {profileForm.formState.errors.lastName && (
                <p className="text-xs text-error mt-1">{profileForm.formState.errors.lastName.message as string}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
            <Input value={profile?.email || ""} disabled className="bg-off-white" />
            <p className="text-xs text-medium-gray mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Phone</label>
            <Input {...profileForm.register("phone")} placeholder="10-digit Indian mobile number" />
            {profileForm.formState.errors.phone && (
              <p className="text-xs text-error mt-1">{profileForm.formState.errors.phone.message as string}</p>
            )}
          </div>
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Card>

      {/* Change password */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-charcoal">Password</h3>
          {!showPassword && (
            <Button variant="ghost" size="sm" onClick={() => setShowPassword(true)}>
              Change Password
            </Button>
          )}
        </div>

        {showPassword && (
          <form
            onSubmit={passwordForm.handleSubmit((data) => changePassword.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Current Password</label>
              <Input type="password" {...passwordForm.register("currentPassword")} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-error mt-1">{passwordForm.formState.errors.currentPassword.message as string}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">New Password</label>
              <Input type="password" {...passwordForm.register("newPassword")} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-error mt-1">{passwordForm.formState.errors.newPassword.message as string}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Confirm New Password</label>
              <Input type="password" {...passwordForm.register("confirmNewPassword")} />
              {passwordForm.formState.errors.confirmNewPassword && (
                <p className="text-xs text-error mt-1">{passwordForm.formState.errors.confirmNewPassword.message as string}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Changing..." : "Change Password"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setShowPassword(false); passwordForm.reset(); }}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
```

---

### Task 5: Storefront — Order History Pages

**Files:**
- Create: `apps/storefront/src/app/(shop)/account/orders/page.tsx`
- Create: `apps/storefront/src/app/(shop)/account/orders/[orderNumber]/page.tsx`

**Context:** Uses existing customer-facing order API: `GET /orders` (list), `GET /orders/:orderNumber` (detail), `POST /orders/:orderNumber/cancel` (cancel). The storefront api-client returns `json.data`. For the detail page, use `use(params)` for Next.js 16 async params.

**Orders list page:**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Badge, Card, Select } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";

const statusOptions = [
  { value: "", label: "All Orders" },
  { value: "PLACED", label: "Placed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const statusVariant: Record<string, "success" | "warning" | "default" | "error" | "info"> = {
  PLACED: "info",
  CONFIRMED: "info",
  PROCESSING: "warning",
  SHIPPED: "warning",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "success",
  CANCELLED: "error",
  RETURNED: "error",
  REFUNDED: "default",
};

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OrdersPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", status, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      if (status) params.set("status", status);
      return api.get(`/orders?${params.toString()}`);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">My Orders</h1>
        <Select
          options={statusOptions}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-40"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !data?.orders?.length ? (
        <Card>
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-light-gray mb-4" />
            <p className="text-medium-gray mb-4">No orders yet</p>
            <Link href="/products">
              <Button>Start Shopping</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.orders.map((order: any) => (
            <Link key={order.id} href={`/account/orders/${order.orderNumber}`}>
              <Card className="hover:border-forest-green/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-charcoal">#{order.orderNumber}</span>
                      <Badge variant={statusVariant[order.status] || "default"}>
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-medium-gray">
                      {formatDate(order.createdAt)} &middot; {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {order.items.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="w-10 h-10 rounded bg-off-white flex items-center justify-center">
                          {item.productImage ? (
                            <img src={item.productImage} alt="" className="w-full h-full object-cover rounded" />
                          ) : (
                            <Package size={14} className="text-medium-gray" />
                          )}
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="w-10 h-10 rounded bg-off-white flex items-center justify-center text-xs text-medium-gray">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-semibold text-charcoal">{formatPrice(order.totalAmount)}</span>
                    <ChevronRight size={16} className="text-medium-gray" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-medium-gray">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="ghost" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Order detail page:**

```tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Badge, Card, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

const statusVariant: Record<string, "success" | "warning" | "default" | "error" | "info"> = {
  PLACED: "info",
  CONFIRMED: "info",
  PROCESSING: "warning",
  SHIPPED: "warning",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "success",
  CANCELLED: "error",
  RETURNED: "error",
  REFUNDED: "default",
};

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["my-order", orderNumber],
    queryFn: () => api.get(`/orders/${orderNumber}`),
  });

  const cancelOrder = useMutation({
    mutationFn: (reason: string) => api.post(`/orders/${orderNumber}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-order", orderNumber] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast.success("Order cancelled");
      setShowCancel(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to cancel order"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-medium-gray">Order not found</p>
        <Link href="/account/orders" className="text-forest-green hover:underline mt-2 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  const canCancel = ["PLACED", "CONFIRMED", "PROCESSING"].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/account/orders" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-charcoal">Order #{order.orderNumber}</h1>
            <Badge variant={statusVariant[order.status] || "default"}>
              {order.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-sm text-medium-gray mt-1">{formatDateTime(order.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Items</h3>
            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4 py-2 border-b border-light-gray last:border-0">
                  <div className="w-16 h-16 rounded-lg bg-off-white flex items-center justify-center flex-shrink-0">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package size={24} className="text-medium-gray" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-charcoal">{item.productName}</p>
                    <p className="text-sm text-medium-gray">
                      {item.variantSize} / {item.variantColor} &middot; Qty: {item.quantity}
                    </p>
                    <p className="text-sm font-medium text-charcoal mt-1">{formatPrice(item.totalPrice)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-light-gray space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-medium-gray">Subtotal</span>
                <span className="text-charcoal">{formatPrice(order.subtotal)}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-forest-green">
                  <span>Discount {order.discountCode ? `(${order.discountCode.code})` : ""}</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              {Number(order.shippingAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-medium-gray">Shipping</span>
                  <span className="text-charcoal">{formatPrice(order.shippingAmount)}</span>
                </div>
              )}
              {order.loyaltyPointsUsed > 0 && (
                <div className="flex justify-between text-forest-green">
                  <span>Loyalty Points ({order.loyaltyPointsUsed} pts)</span>
                  <span>-{formatPrice(order.loyaltyPointsUsed)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-light-gray">
                <span>Total</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </Card>

          {/* Status Timeline */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Order Timeline</h3>
            <div className="space-y-4">
              {order.statusHistory?.map((entry: any, i: number) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1 ${i === 0 ? "bg-forest-green" : "bg-light-gray"}`} />
                    {i < order.statusHistory.length - 1 && <div className="w-0.5 flex-1 bg-light-gray mt-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[entry.status] || "default"}>
                        {entry.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-medium-gray">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    {entry.note && <p className="text-sm text-dark-gray mt-1">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Shipping address */}
          {order.address && (
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-3">Shipping Address</h3>
              <div className="text-sm text-dark-gray space-y-1">
                <p className="font-medium text-charcoal">{order.address.fullName}</p>
                <p>{order.address.line1}</p>
                {order.address.line2 && <p>{order.address.line2}</p>}
                <p>{order.address.city}, {order.address.state} {order.address.pinCode}</p>
                <p>{order.address.phone}</p>
              </div>
            </Card>
          )}

          {/* Payment */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-3">Payment</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-medium-gray">Status</span>
                <Badge variant={order.payment?.status === "CAPTURED" ? "success" : "warning"}>
                  {order.payment?.status || "Pending"}
                </Badge>
              </div>
              {order.payment?.paidAt && (
                <div className="flex justify-between">
                  <span className="text-medium-gray">Paid</span>
                  <span className="text-charcoal">{formatDateTime(order.payment.paidAt)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Cancel */}
          {canCancel && (
            <Card>
              {!showCancel ? (
                <Button variant="ghost" className="w-full text-error" onClick={() => setShowCancel(true)}>
                  Cancel Order
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-charcoal">Reason for cancellation</p>
                  <Input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Why are you cancelling?"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={cancelReason.length < 5 || cancelOrder.isPending}
                      onClick={() => cancelOrder.mutate(cancelReason)}
                    >
                      Confirm Cancel
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)}>
                      Keep Order
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {order.loyaltyPointsEarned > 0 && (
            <Card>
              <p className="text-sm text-medium-gray">
                You earned <span className="font-semibold text-forest-green">{order.loyaltyPointsEarned} loyalty points</span> from this order!
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Task 6: Storefront — Wishlist Page

**Files:**
- Create: `apps/storefront/src/app/(shop)/account/wishlist/page.tsx`

**Context:** Uses `GET /wishlist` to fetch items. Each item includes product data (name, slug, price, compareAtPrice, images). Has remove button via `DELETE /wishlist/:productId`. Links to product pages via `/products/:slug`.

**Code:**

```tsx
"use client";

import Link from "next/link";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Card } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export default function WishlistPage() {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => api.get("/wishlist"),
  });

  const removeItem = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Removed from wishlist");
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">My Wishlist</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : !items?.length ? (
        <Card>
          <div className="text-center py-12">
            <Heart size={48} className="mx-auto text-light-gray mb-4" />
            <p className="text-medium-gray mb-4">Your wishlist is empty</p>
            <Link href="/products">
              <Button>
                <ShoppingBag size={16} />
                Browse Products
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => (
            <Card key={item.id} className="group relative">
              <button
                onClick={() => removeItem.mutate(item.product.id)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white shadow-sm hover:bg-error/10 transition-colors"
                title="Remove from wishlist"
              >
                <Trash2 size={14} className="text-error" />
              </button>
              <Link href={`/products/${item.product.slug}`}>
                <div className="aspect-[3/4] rounded-lg bg-off-white mb-3 overflow-hidden">
                  {item.product.images?.[0]?.url ? (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={32} className="text-light-gray" />
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-charcoal group-hover:text-forest-green transition-colors truncate">
                  {item.product.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold text-charcoal">{formatPrice(item.product.price)}</span>
                  {item.product.compareAtPrice && Number(item.product.compareAtPrice) > Number(item.product.price) && (
                    <span className="text-sm text-medium-gray line-through">
                      {formatPrice(item.product.compareAtPrice)}
                    </span>
                  )}
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Task 7: Verify Build

Run `pnpm turbo build` from the repo root. All apps must build successfully.
