# Phase 4: Admin Core - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the admin dashboard core — API client, state management, Shopify-style layout (sidebar + topbar), login page, dashboard home with KPI cards, product management CRUD, and category management.

**Architecture:** Next.js 16 App Router. Admin uses same API client pattern as storefront (fetch + JWT + auto-refresh). TanStack Query for server state, Zustand for auth/UI state, react-hook-form + Zod for forms. Sidebar navigation, protected routes with role check (ADMIN/SUPER_ADMIN only). Recharts for dashboard charts.

**Tech Stack:** Next.js 16.1.6, React 19, Tailwind CSS 4, TanStack Query 5, Zustand 5, react-hook-form 7, Zod 4, Recharts 3, Lucide React, Framer Motion

**Color Palette (already in globals.css @theme):**
- Forest Green `#2D5016` — primary actions, active sidebar
- Deep Earth `#3D2B1F` — sidebar background, headings
- Cream `#FAF7F2` — content area cards
- Off-white `#F5F5F5` — page background
- Charcoal `#2C2C2C` — body text
- Success `#4A7C59`, Warning `#D4A843`, Error `#C0392B`, Info `#5B8FA8`

**API Base:** `http://localhost:5000/api/v1` (same as storefront)

**Existing Admin Files (skeleton):**
- `apps/admin/src/app/globals.css` — Tailwind @theme tokens ✓
- `apps/admin/src/app/layout.tsx` — Root layout with Inter font ✓
- `apps/admin/src/app/page.tsx` — Placeholder page (will be replaced)
- `apps/admin/package.json` — All deps installed ✓
- `apps/admin/tsconfig.json` — Configured with @/* alias ✓
- `apps/admin/next.config.ts` — transpilePackages configured ✓

**API Endpoints Available:**
- `POST /auth/login` → `{ user, accessToken, refreshToken }`
- `POST /auth/refresh` → `{ accessToken, refreshToken }`
- `GET /auth/me` → user object
- `GET /products?page=&limit=&status=&category=&search=&sortBy=&sortOrder=` → `{ products, total, page, limit, totalPages }`
- `POST /products` → product
- `PUT /products/:id` → product
- `DELETE /products/:id` → soft-delete (archive)
- `POST /products/:id/variants` → variants
- `PUT /products/variants/:variantId` → variant
- `DELETE /products/variants/:variantId` → void
- `GET /categories` → categories[]
- `POST /categories` → category
- `PUT /categories/:id` → category
- `DELETE /categories/:id` → void
- `PUT /categories/reorder` → void

---

### Task 1: API Client, Query Client, Auth Store, UI Store

Set up the foundational infrastructure for admin: fetch-based API client (same pattern as storefront), TanStack Query client + provider, Zustand auth store (admin-only role check), and UI store for sidebar state.

**Files to create:**
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/lib/query-client.ts`
- `apps/admin/src/providers/query-provider.tsx`
- `apps/admin/src/stores/auth-store.ts`
- `apps/admin/src/stores/ui-store.ts`

**File: `apps/admin/src/lib/api-client.ts`**

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: { field?: string; message: string }[];
  };
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("adminAccessToken");
  }

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("adminRefreshToken");
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem("adminAccessToken", accessToken);
    localStorage.setItem("adminRefreshToken", refreshToken);
  }

  clearTokens() {
    localStorage.removeItem("adminAccessToken");
    localStorage.removeItem("adminRefreshToken");
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        this.clearTokens();
        return false;
      }

      const data = await res.json();
      if (data.success && data.data) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    // If 401, try refresh
    if (res.status === 401 && token) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${this.getToken()}`;
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      }
    }

    const json: ApiResponse<T> = await res.json();

    if (!res.ok || !json.success) {
      throw {
        status: res.status,
        code: json.error?.code || "ERROR",
        message: json.error?.message || "Something went wrong",
        details: json.error?.details,
      };
    }

    return json.data as T;
  }

  get<T = any>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  post<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();
```

**Key difference from storefront:** Uses `adminAccessToken` / `adminRefreshToken` keys so admin and storefront sessions don't conflict. Also exposes `clearTokens()` as public for logout.

**File: `apps/admin/src/lib/query-client.ts`**

```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**File: `apps/admin/src/providers/query-provider.tsx`**

```typescript
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**File: `apps/admin/src/stores/auth-store.ts`**

```typescript
import { create } from "zustand";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: AdminUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;

  login: (user: AdminUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem("adminAccessToken", accessToken);
    localStorage.setItem("adminRefreshToken", refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("adminAccessToken");
    localStorage.removeItem("adminRefreshToken");
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
```

**Key difference from storefront:** Uses `adminAccessToken`/`adminRefreshToken` localStorage keys. No referralCode/loyaltyPoints fields (admin doesn't need those).

**File: `apps/admin/src/stores/ui-store.ts`**

```typescript
import { create } from "zustand";

interface UIState {
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;

  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,

  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
}));
```

---

### Task 2: Admin Base UI Components

Build admin-specific UI primitives: Button, Input, Badge, Card, Modal, Toast, Spinner, Skeleton, Select, Textarea. These are similar to storefront but with admin-specific styling (deep earth accents, more compact sizing for data-heavy interfaces).

**Files to create:**
- `apps/admin/src/components/ui/spinner.tsx`
- `apps/admin/src/components/ui/skeleton.tsx`
- `apps/admin/src/components/ui/button.tsx`
- `apps/admin/src/components/ui/input.tsx`
- `apps/admin/src/components/ui/select.tsx`
- `apps/admin/src/components/ui/textarea.tsx`
- `apps/admin/src/components/ui/badge.tsx`
- `apps/admin/src/components/ui/card.tsx`
- `apps/admin/src/components/ui/modal.tsx`
- `apps/admin/src/components/ui/toast.tsx`
- `apps/admin/src/components/ui/index.ts`

**File: `apps/admin/src/components/ui/spinner.tsx`**

```typescript
"use client";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-3",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-current border-t-transparent ${sizeStyles[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
```

**File: `apps/admin/src/components/ui/skeleton.tsx`**

```typescript
"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-light-gray rounded-md ${className}`}
      aria-hidden="true"
    />
  );
}
```

**File: `apps/admin/src/components/ui/button.tsx`**

```typescript
"use client";

import { forwardRef } from "react";
import { Spinner } from "./spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantStyles = {
  primary: "bg-deep-earth text-white hover:bg-deep-earth/90 active:bg-deep-earth/80",
  secondary: "border-[1.5px] border-deep-earth text-deep-earth hover:bg-deep-earth hover:text-white",
  ghost: "text-dark-gray hover:bg-off-white",
  danger: "bg-error text-white hover:bg-error/90",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm h-8",
  md: "px-4 py-2 text-sm h-9",
  lg: "px-6 py-3 text-base h-11",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, disabled, children, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && <Spinner size="sm" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
```

**Key difference from storefront:** Primary color is `deep-earth` instead of `forest-green`. Sizes are more compact (admin is data-heavy, needs tighter spacing).

**File: `apps/admin/src/components/ui/input.tsx`**

```typescript
"use client";

import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-charcoal">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 h-9 rounded-lg border bg-white text-charcoal text-sm placeholder:text-medium-gray transition-colors duration-150 outline-none ${
            error
              ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
              : "border-light-gray focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        {helperText && !error && <p className="text-xs text-medium-gray">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
```

**File: `apps/admin/src/components/ui/select.tsx`**

```typescript
"use client";

import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-charcoal">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full px-3 py-2 h-9 rounded-lg border bg-white text-charcoal text-sm transition-colors duration-150 outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234A4A4A%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat pr-10 ${
            error
              ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
              : "border-light-gray focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
```

**File: `apps/admin/src/components/ui/textarea.tsx`**

```typescript
"use client";

import { forwardRef } from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-charcoal">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full px-3 py-2 rounded-lg border bg-white text-charcoal text-sm placeholder:text-medium-gray transition-colors duration-150 outline-none resize-y min-h-[80px] ${
            error
              ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
              : "border-light-gray focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
```

**File: `apps/admin/src/components/ui/badge.tsx`**

```typescript
"use client";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "info";
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  default: "bg-light-gray text-dark-gray",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  info: "bg-info/10 text-info",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
```

**File: `apps/admin/src/components/ui/card.tsx`**

```typescript
"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = "", padding = true }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-light-gray ${padding ? "p-6" : ""} ${className}`}>
      {children}
    </div>
  );
}
```

**Key difference from storefront:** No hover/scale effects (admin cards are static containers, not clickable product cards). Has border instead of shadow. Has a `padding` prop.

**File: `apps/admin/src/components/ui/modal.tsx`**

```typescript
"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-lg w-full ${sizeStyles[size]} max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-light-gray">
            <h2 className="text-lg font-semibold text-deep-earth">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-off-white transition-colors">
              <X size={20} className="text-dark-gray" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
```

**File: `apps/admin/src/components/ui/toast.tsx`**

```typescript
"use client";

import { create } from "zustand";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().addToast("success", message),
  error: (message: string) => useToastStore.getState().addToast("error", message),
  warning: (message: string) => useToastStore.getState().addToast("warning", message),
  info: (message: string) => useToastStore.getState().addToast("info", message),
};

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: "bg-success text-white",
  error: "bg-error text-white",
  warning: "bg-warning text-white",
  info: "bg-info text-white",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl ${styles[t.type]}`}
          >
            <Icon size={20} />
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="p-0.5 hover:opacity-80">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

**File: `apps/admin/src/components/ui/index.ts`**

```typescript
export { Button } from "./button";
export { Input } from "./input";
export { Select } from "./select";
export { Textarea } from "./textarea";
export { Badge } from "./badge";
export { Card } from "./card";
export { Modal } from "./modal";
export { Spinner } from "./spinner";
export { Skeleton } from "./skeleton";
export { ToastContainer, toast, useToastStore } from "./toast";
```

---

### Task 3: Admin Layout — Sidebar, Topbar, AuthGuard

Build the Shopify-style admin layout: collapsible sidebar on the left with navigation, topbar with user menu and breadcrumb area. AuthGuard component that checks JWT + role on mount and redirects to login if not admin.

**Files to create:**
- `apps/admin/src/components/layout/sidebar.tsx`
- `apps/admin/src/components/layout/topbar.tsx`
- `apps/admin/src/components/layout/admin-layout.tsx`
- `apps/admin/src/components/layout/auth-guard.tsx`
- `apps/admin/src/app/(admin)/layout.tsx`

**File to modify:**
- `apps/admin/src/app/layout.tsx` — Add QueryProvider + ToastContainer

**Modify: `apps/admin/src/app/layout.tsx`**

Add QueryProvider wrapper and ToastContainer to root layout:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { ToastContainer } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Earth Revibe Admin",
    template: "%s | Earth Revibe Admin",
  },
  description: "Earth Revibe Admin Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-off-white text-charcoal antialiased">
        <QueryProvider>
          {children}
          <ToastContainer />
        </QueryProvider>
      </body>
    </html>
  );
}
```

**File: `apps/admin/src/components/layout/sidebar.tsx`**

Shopify-style collapsible sidebar with navigation groups.

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Leaf,
  X,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/products", icon: Package },
  { label: "Categories", href: "/categories", icon: FolderTree },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  const isActive = (href: string) => pathname.startsWith(href);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        <div className="w-8 h-8 bg-forest-green rounded-lg flex items-center justify-center flex-shrink-0">
          <Leaf size={18} className="text-white" />
        </div>
        {!isSidebarCollapsed && (
          <span className="text-base font-semibold text-white whitespace-nowrap">Earth Revibe</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-forest-green text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:block border-t border-white/10 p-3">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
        >
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isSidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-deep-earth h-screen sticky top-0 transition-all duration-200 ${
          isSidebarCollapsed ? "w-[72px]" : "w-[240px]"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-[260px] bg-deep-earth flex flex-col z-50">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
```

**File: `apps/admin/src/components/layout/topbar.tsx`**

Top bar with hamburger, page title area, and user dropdown menu.

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { api } from "@/lib/api-client";

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { setMobileSidebarOpen } = useUIStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("adminRefreshToken");
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Ignore errors on logout
    }
    logout();
    router.push("/login");
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "AD";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-light-gray h-16 flex items-center px-4 lg:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden p-2 -ml-2 rounded-md hover:bg-off-white transition-colors mr-2"
      >
        <Menu size={20} className="text-dark-gray" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-off-white transition-colors"
        >
          <div className="w-8 h-8 bg-deep-earth rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-white">{initials}</span>
          </div>
          <span className="hidden sm:block text-sm font-medium text-charcoal">
            {user?.firstName} {user?.lastName}
          </span>
          <ChevronDown size={16} className="text-medium-gray" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-light-gray shadow-lg py-1 z-50">
            <div className="px-4 py-2 border-b border-light-gray">
              <p className="text-sm font-medium text-charcoal">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-medium-gray">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-off-white transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
```

**File: `apps/admin/src/components/layout/auth-guard.tsx`**

Checks auth on mount. If no token, redirect to `/login`. If token exists, fetch `/auth/me` to verify and check role is ADMIN or SUPER_ADMIN.

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, setUser, clearUser, setLoading } = useAuthStore();

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem("adminAccessToken");
      if (!token) {
        clearUser();
        router.replace("/login");
        return;
      }

      try {
        const user = await api.get("/auth/me");
        if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
          api.clearTokens();
          clearUser();
          router.replace("/login");
          return;
        }
        setUser(user);
      } catch {
        clearUser();
        router.replace("/login");
      }
    }

    checkAuth();
  }, [router, setUser, clearUser, setLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-off-white">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-deep-earth" />
          <p className="text-sm text-medium-gray">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

**File: `apps/admin/src/components/layout/admin-layout.tsx`**

Wraps AuthGuard + Sidebar + Topbar + content area.

```typescript
"use client";

import { AuthGuard } from "./auth-guard";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
```

**File: `apps/admin/src/app/(admin)/layout.tsx`**

Route group layout that uses AdminLayout:

```typescript
import { AdminLayout } from "@/components/layout/admin-layout";

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
```

---

### Task 4: Admin Login Page

Build the admin login page at `/login` (outside the `(admin)` layout group — no sidebar). Clean, centered card with Earth Revibe branding. Uses react-hook-form + Zod loginSchema. On success, checks role is ADMIN/SUPER_ADMIN before storing tokens.

**Files to create:**
- `apps/admin/src/app/login/page.tsx`

**File to modify:**
- `apps/admin/src/app/page.tsx` — Redirect to `/dashboard` or `/login`

**File: `apps/admin/src/app/login/page.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@earth-revibe/shared";
import { Leaf } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const result = await api.post("/auth/login", data);

      // Check admin role
      if (result.user.role !== "ADMIN" && result.user.role !== "SUPER_ADMIN") {
        toast.error("Access denied. Admin privileges required.");
        return;
      }

      login(result.user, result.accessToken, result.refreshToken);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-deep-earth rounded-xl flex items-center justify-center mb-3">
            <Leaf size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-deep-earth">Earth Revibe</h1>
          <p className="text-sm text-medium-gray mt-1">Admin Dashboard</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-xl border border-light-gray p-6">
          <h2 className="text-lg font-semibold text-charcoal mb-1">Sign in</h2>
          <p className="text-sm text-medium-gray mb-6">Enter your admin credentials</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@earthrevibe.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" isLoading={isLoading} className="w-full">
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

**Modify: `apps/admin/src/app/page.tsx`**

Replace placeholder with redirect to dashboard:

```typescript
import { redirect } from "next/navigation";

export default function AdminRootPage() {
  redirect("/dashboard");
}
```

---

### Task 5: Dashboard Home Page

Build the admin dashboard at `/dashboard` inside the `(admin)` layout group. Shows:
- Page header with title "Dashboard" and date
- 4 KPI stat cards (Total Revenue, Orders, Customers, Products) — placeholder data for now (no order/customer APIs yet)
- Revenue chart (placeholder Recharts area chart)
- Recent orders table (placeholder with mock data — real order API comes in Phase 6)

**Files to create:**
- `apps/admin/src/app/(admin)/dashboard/page.tsx`
- `apps/admin/src/components/dashboard/stat-card.tsx`
- `apps/admin/src/components/dashboard/revenue-chart.tsx`
- `apps/admin/src/components/dashboard/recent-orders.tsx`

**File: `apps/admin/src/components/dashboard/stat-card.tsx`**

```typescript
"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

const changeStyles = {
  positive: "text-success",
  negative: "text-error",
  neutral: "text-medium-gray",
};

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-medium-gray">{title}</p>
          <p className="text-2xl font-semibold text-charcoal mt-1">{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${changeStyles[changeType]}`}>{change}</p>
          )}
        </div>
        <div className="w-10 h-10 bg-off-white rounded-lg flex items-center justify-center">
          <Icon size={20} className="text-deep-earth" />
        </div>
      </div>
    </Card>
  );
}
```

**File: `apps/admin/src/components/dashboard/revenue-chart.tsx`**

Placeholder Recharts area chart. Uses mock data since we don't have order APIs yet.

```typescript
"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";

const mockData = [
  { month: "Jan", revenue: 45000 },
  { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 61000 },
  { month: "Apr", revenue: 58000 },
  { month: "May", revenue: 71000 },
  { month: "Jun", revenue: 83000 },
];

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueChart() {
  return (
    <Card>
      <h3 className="text-base font-semibold text-charcoal mb-4">Revenue Overview</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8E8E8E" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#8E8E8E" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: number) => [formatINR(value), "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid #E5E5E5" }} />
            <Area type="monotone" dataKey="revenue" stroke="#2D5016" fill="#2D5016" fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
```

**File: `apps/admin/src/components/dashboard/recent-orders.tsx`**

Placeholder table with mock order data.

```typescript
"use client";

import { Card, Badge } from "@/components/ui";
import { formatPrice } from "@earth-revibe/shared";

const mockOrders = [
  { id: "ORD-2026-001", customer: "Priya Sharma", total: 4599, status: "DELIVERED", date: "2026-03-05" },
  { id: "ORD-2026-002", customer: "Rahul Patel", total: 7299, status: "SHIPPED", date: "2026-03-04" },
  { id: "ORD-2026-003", customer: "Ananya Gupta", total: 3199, status: "PROCESSING", date: "2026-03-04" },
  { id: "ORD-2026-004", customer: "Vikram Singh", total: 5899, status: "PENDING", date: "2026-03-03" },
  { id: "ORD-2026-005", customer: "Meera Joshi", total: 8499, status: "DELIVERED", date: "2026-03-03" },
];

const statusVariant: Record<string, "success" | "info" | "warning" | "default" | "error"> = {
  DELIVERED: "success",
  SHIPPED: "info",
  PROCESSING: "warning",
  PENDING: "default",
  CANCELLED: "error",
};

export function RecentOrders() {
  return (
    <Card padding={false}>
      <div className="px-6 py-4 border-b border-light-gray">
        <h3 className="text-base font-semibold text-charcoal">Recent Orders</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-light-gray bg-off-white/50">
              <th className="text-left px-6 py-3 font-medium text-medium-gray">Order</th>
              <th className="text-left px-6 py-3 font-medium text-medium-gray">Customer</th>
              <th className="text-left px-6 py-3 font-medium text-medium-gray">Total</th>
              <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
              <th className="text-left px-6 py-3 font-medium text-medium-gray">Date</th>
            </tr>
          </thead>
          <tbody>
            {mockOrders.map((order) => (
              <tr key={order.id} className="border-b border-light-gray last:border-0 hover:bg-off-white/50">
                <td className="px-6 py-3 font-medium text-charcoal">{order.id}</td>
                <td className="px-6 py-3 text-dark-gray">{order.customer}</td>
                <td className="px-6 py-3 text-charcoal">{formatPrice(order.total)}</td>
                <td className="px-6 py-3">
                  <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                </td>
                <td className="px-6 py-3 text-medium-gray">{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
```

**Note on `formatPrice`:** The shared package has `formatPrice` in `packages/shared/src/utils/format.ts`. If the import path is `@earth-revibe/shared`, verify the export exists. If it's named `formatPrice` in the shared package, use it. Otherwise define locally:
```typescript
function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
```

**File: `apps/admin/src/app/(admin)/dashboard/page.tsx`**

```typescript
"use client";

import { IndianRupee, ShoppingCart, Users, Package } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentOrders } from "@/components/dashboard/recent-orders";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Dashboard</h1>
        <p className="text-sm text-medium-gray mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value="₹3,70,000"
          change="+12.5% from last month"
          changeType="positive"
          icon={IndianRupee}
        />
        <StatCard
          title="Orders"
          value="156"
          change="+8.2% from last month"
          changeType="positive"
          icon={ShoppingCart}
        />
        <StatCard
          title="Customers"
          value="1,247"
          change="+23 new this week"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Products"
          value="48"
          change="3 low stock"
          changeType="negative"
          icon={Package}
        />
      </div>

      {/* Charts + Recent Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart />
        <RecentOrders />
      </div>
    </div>
  );
}
```

---

### Task 6: Product Management — List + Create/Edit

Build the admin products page with a data table (search, filter by status, paginated) and a create/edit product form in a full page. Uses TanStack Query for data fetching and react-hook-form + Zod for the form.

**Files to create:**
- `apps/admin/src/hooks/use-products.ts`
- `apps/admin/src/app/(admin)/products/page.tsx`
- `apps/admin/src/app/(admin)/products/new/page.tsx`
- `apps/admin/src/app/(admin)/products/[id]/edit/page.tsx`
- `apps/admin/src/components/products/product-form.tsx`

**File: `apps/admin/src/hooks/use-products.ts`**

TanStack Query hooks for product CRUD.

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface ProductListParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useProducts(params: ProductListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ["admin-products", params],
    queryFn: () => api.get(`/products?${searchParams.toString()}`),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => api.get(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}
```

**File: `apps/admin/src/app/(admin)/products/page.tsx`**

Product listing page with search, status filter, and data table.

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button, Input, Badge, Card, Select } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { useProducts, useDeleteProduct } from "@/hooks/use-products";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

const statusVariant: Record<string, "success" | "warning" | "default" | "error"> = {
  ACTIVE: "success",
  DRAFT: "warning",
  ARCHIVED: "default",
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useProducts({ page, limit: 20, status: status || undefined, search: search || undefined });
  const deleteProduct = useDeleteProduct();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive "${name}"?`)) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success("Product archived");
    } catch (err: any) {
      toast.error(err.message || "Failed to archive product");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Products</h1>
          <p className="text-sm text-medium-gray mt-1">Manage your product catalog</p>
        </div>
        <Link href="/products/new">
          <Button>
            <Plus size={18} />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full sm:w-40"
          />
        </div>
      </Card>

      {/* Products table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.products?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No products found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Product</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Category</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Price</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product: any) => (
                    <tr key={product.id} className="border-b border-light-gray last:border-0 hover:bg-off-white/50">
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium text-charcoal">{product.name}</p>
                          <p className="text-xs text-medium-gray">{product.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-dark-gray">{product.category?.name || "—"}</td>
                      <td className="px-6 py-3 text-charcoal">{formatPrice(product.price)}</td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant[product.status] || "default"}>
                          {product.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} className="text-dark-gray" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="p-1.5 rounded-md hover:bg-error/10 transition-colors"
                            title="Archive"
                          >
                            <Trash2 size={16} className="text-error" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {data.page} of {data.totalPages} ({data.total} products)
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
                    disabled={page >= data.totalPages}
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

**File: `apps/admin/src/components/products/product-form.tsx`**

Shared form component for create and edit. Uses react-hook-form + Zod createProductSchema.

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductSchema, type CreateProductInput, ProductStatus } from "@earth-revibe/shared";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, Select, Textarea, Card } from "@/components/ui";
import { api } from "@/lib/api-client";

interface ProductFormProps {
  defaultValues?: Partial<CreateProductInput>;
  onSubmit: (data: CreateProductInput) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
}

export function ProductForm({ defaultValues, onSubmit, isSubmitting, submitLabel }: ProductFormProps) {
  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.get("/categories"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      status: ProductStatus.DRAFT,
      isFeatured: false,
      ...defaultValues,
    },
  });

  const statusOptions = [
    { value: ProductStatus.DRAFT, label: "Draft" },
    { value: ProductStatus.ACTIVE, label: "Active" },
    { value: ProductStatus.ARCHIVED, label: "Archived" },
  ];

  const categoryOptions = (categories || []).map((c: any) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Product Details</h3>
            <div className="space-y-4">
              <Input
                label="Product Name"
                placeholder="e.g. Organic Cotton T-Shirt"
                error={errors.name?.message}
                {...register("name")}
              />
              <Input
                label="Slug (auto-generated if empty)"
                placeholder="organic-cotton-t-shirt"
                error={errors.slug?.message}
                {...register("slug")}
              />
              <Textarea
                label="Description"
                placeholder="Describe your product..."
                rows={5}
                error={errors.description?.message}
                {...register("description")}
              />
              <Input
                label="Short Description"
                placeholder="Brief product summary"
                error={errors.shortDescription?.message}
                {...register("shortDescription")}
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Price (INR)"
                type="number"
                step="0.01"
                placeholder="3999"
                error={errors.price?.message}
                {...register("price")}
              />
              <Input
                label="Compare At Price (INR)"
                type="number"
                step="0.01"
                placeholder="4999"
                helperText="Original price for showing discount"
                error={errors.compareAtPrice?.message}
                {...register("compareAtPrice")}
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Details</h3>
            <div className="space-y-4">
              <Input
                label="Material"
                placeholder="100% Organic Cotton"
                error={errors.material?.message}
                {...register("material")}
              />
              <Textarea
                label="Care Instructions"
                placeholder="Machine wash cold..."
                rows={3}
                error={errors.careInstructions?.message}
                {...register("careInstructions")}
              />
            </div>
          </Card>
        </div>

        {/* Sidebar - right 1/3 */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Status</h3>
            <Select
              label="Product Status"
              options={statusOptions}
              error={errors.status?.message}
              {...register("status")}
            />
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Organization</h3>
            <div className="space-y-4">
              <Select
                label="Category"
                options={categoryOptions}
                placeholder="Select category"
                error={errors.categoryId?.message}
                {...register("categoryId")}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-light-gray text-deep-earth focus:ring-deep-earth"
                  {...register("isFeatured")}
                />
                <span className="text-sm text-charcoal">Featured product</span>
              </label>
            </div>
          </Card>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
```

**File: `apps/admin/src/app/(admin)/products/new/page.tsx`**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/products/product-form";
import { useCreateProduct } from "@/hooks/use-products";
import { toast } from "@/components/ui/toast";
import type { CreateProductInput } from "@earth-revibe/shared";

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  const handleSubmit = async (data: CreateProductInput) => {
    try {
      await createProduct.mutateAsync(data);
      toast.success("Product created successfully");
      router.push("/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/products" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Add Product</h1>
          <p className="text-sm text-medium-gray mt-1">Create a new product listing</p>
        </div>
      </div>

      <ProductForm
        onSubmit={handleSubmit}
        isSubmitting={createProduct.isPending}
        submitLabel="Create Product"
      />
    </div>
  );
}
```

**File: `apps/admin/src/app/(admin)/products/[id]/edit/page.tsx`**

```typescript
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/products/product-form";
import { useProduct, useUpdateProduct } from "@/hooks/use-products";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import type { CreateProductInput } from "@earth-revibe/shared";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: product, isLoading } = useProduct(id);
  const updateProduct = useUpdateProduct();

  const handleSubmit = async (data: CreateProductInput) => {
    try {
      await updateProduct.mutateAsync({ id, data });
      toast.success("Product updated successfully");
      router.push("/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" className="text-deep-earth" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-medium-gray">Product not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/products" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Edit Product</h1>
          <p className="text-sm text-medium-gray mt-1">{product.name}</p>
        </div>
      </div>

      <ProductForm
        defaultValues={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          shortDescription: product.shortDescription || undefined,
          price: product.price,
          compareAtPrice: product.compareAtPrice || undefined,
          material: product.material || undefined,
          careInstructions: product.careInstructions || undefined,
          status: product.status,
          isFeatured: product.isFeatured,
          categoryId: product.categoryId,
        }}
        onSubmit={handleSubmit}
        isSubmitting={updateProduct.isPending}
        submitLabel="Update Product"
      />
    </div>
  );
}
```

**Important note for `[id]/edit/page.tsx`:** In Next.js 16, dynamic route `params` is a Promise. Use `const { id } = use(params)` to unwrap it. This matches the React 19 `use()` API.

**Important note for `useProduct` hook:** The API product endpoints use slug for GET (`/products/:slug`), but for edit we need to fetch by ID. The product list already returns product objects with `id`. We need to verify if the API supports fetching by ID. If not, the hook should be adjusted. Looking at the API routes:
- `GET /products/:slug` — fetches by slug
- `PUT /products/:id` — updates by id

For editing, we get the product ID from the list, and we need to fetch its data. Two options:
1. Pass the full product data via URL state (avoid extra fetch)
2. Use the slug to fetch

Since the product list already gives us the product data, but we navigate to `/products/:id/edit`, we should either:
- Change the hook to fetch by slug and adjust the route to use slug
- OR add a `getProductById` API endpoint

**Simplest approach:** The edit page gets the ID from the URL. The `useProduct` hook should actually fetch by slug since that's what the API supports. But we have the product data from the list. Let's change the edit route to use slug instead:

Actually, looking at the API more carefully:
- `GET /products/:slug` works with slug
- `PUT /products/:id` works with id

The edit page needs both: fetch by slug to get data, update by id. But the URL uses id. Let's keep the id-based URL and add a note that the `useProduct` hook needs to work with the product list cache, or we need a `GET /products/by-id/:id` endpoint.

**Simplest fix:** Change the route to `/products/[slug]/edit` and use slug for fetching, then use `product.id` for the update mutation.

Let me adjust the plan:

The route should be `apps/admin/src/app/(admin)/products/[slug]/edit/page.tsx` and use slug for data fetching. Links from the product table should use `product.slug` instead of `product.id`. The update mutation still uses `product.id`.

Update the products page table link to:
```typescript
<Link href={`/products/${product.slug}/edit`} ...>
```

Update the edit page:
```typescript
export default function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  // ... useProduct fetches by slug via GET /products/:slug
  // update uses product.id
}
```

And the `useProduct` hook becomes:
```typescript
export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["admin-product", slug],
    queryFn: () => api.get(`/products/${slug}`),
    enabled: !!slug,
  });
}
```

---

### Task 7: Category Management

Build the admin categories page with a list view and create/edit modal. Categories are simpler than products (fewer fields), so we use a modal instead of a separate page.

**Files to create:**
- `apps/admin/src/hooks/use-categories.ts`
- `apps/admin/src/app/(admin)/categories/page.tsx`

**File: `apps/admin/src/hooks/use-categories.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.get("/categories"),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
}
```

**File: `apps/admin/src/app/(admin)/categories/page.tsx`**

Categories list with inline create/edit modal.

```typescript
"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCategorySchema, type CreateCategoryInput } from "@earth-revibe/shared";
import { Button, Input, Textarea, Card, Badge, Modal } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
  });

  const openCreate = () => {
    setEditingCategory(null);
    reset({ name: "", description: "", slug: "", sortOrder: 0, isActive: true });
    setIsModalOpen(true);
  };

  const openEdit = (category: any) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || "",
      slug: category.slug,
      image: category.image || "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: CreateCategoryInput) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data });
        toast.success("Category updated");
      } else {
        await createCategory.mutateAsync(data);
        toast.success("Category created");
      }
      setIsModalOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Category deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  const isSubmitting = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Categories</h1>
          <p className="text-sm text-medium-gray mt-1">Organize your product catalog</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Add Category
        </Button>
      </div>

      {/* Categories list */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !categories?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No categories yet. Create your first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-gray bg-off-white/50">
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Slug</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Order</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: any) => (
                  <tr key={cat.id} className="border-b border-light-gray last:border-0 hover:bg-off-white/50">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-charcoal">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-medium-gray line-clamp-1">{cat.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-dark-gray">{cat.slug}</td>
                    <td className="px-6 py-3 text-dark-gray">{cat.sortOrder}</td>
                    <td className="px-6 py-3">
                      <Badge variant={cat.isActive ? "success" : "default"}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} className="text-dark-gray" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-1.5 rounded-md hover:bg-error/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-error" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? "Edit Category" : "Add Category"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Tops & Basics"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Slug (auto-generated if empty)"
            placeholder="tops-and-basics"
            error={errors.slug?.message}
            {...register("slug")}
          />
          <Textarea
            label="Description"
            placeholder="Category description..."
            rows={3}
            error={errors.description?.message}
            {...register("description")}
          />
          <Input
            label="Image URL"
            placeholder="https://..."
            error={errors.image?.message}
            {...register("image")}
          />
          <Input
            label="Sort Order"
            type="number"
            error={errors.sortOrder?.message}
            {...register("sortOrder")}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-light-gray text-deep-earth focus:ring-deep-earth"
              {...register("isActive")}
            />
            <span className="text-sm text-charcoal">Active</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingCategory ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

---

### Task 8: Verify Build

Run `pnpm turbo build --filter=@earth-revibe/admin` and fix any TypeScript or build errors.

**Potential issues to watch for:**
1. Import paths — all `@/` imports resolve to `apps/admin/src/`
2. `@earth-revibe/shared` exports — verify `ProductStatus`, `createProductSchema`, `loginSchema`, `createCategorySchema`, `formatPrice` are all exported
3. Next.js 16 dynamic params — must use `params: Promise<{...}>` and unwrap with `use()`
4. Missing `"use client"` directives on pages that use hooks
5. Recharts SSR — may need dynamic import with `ssr: false` if Recharts doesn't support server rendering
6. Tailwind CSS 4 — verify all color classes (`bg-deep-earth`, `text-forest-green`, etc.) match the @theme tokens in globals.css

**If Recharts causes SSR issues**, wrap the chart import:
```typescript
import dynamic from "next/dynamic";
const RevenueChart = dynamic(() => import("@/components/dashboard/revenue-chart").then(m => ({ default: m.RevenueChart })), { ssr: false });
```

**If `formatPrice` is not exported from shared**, check `packages/shared/src/utils/format.ts` for the exact function name and update the import, or define it locally in the component.
