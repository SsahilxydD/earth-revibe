# Phase 1: Foundation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Turborepo monorepo with shared packages (Zod schemas, enums, Prisma DB), ready for API and frontend development.

**Architecture:** Turborepo monorepo with pnpm workspaces. Three apps (storefront, admin, api) share two packages (shared for Zod/enums/types, db for Prisma). TypeScript strict mode everywhere.

**Tech Stack:** Turborepo 2.8.13, pnpm, TypeScript 5.9.3, Zod 4.3.6, Prisma 7.4.2, PostgreSQL 16, Next.js 16.1.6, Express 5.2.1

---

### Task 1: Initialize Git + Monorepo Root

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.npmrc`

**Step 1: Initialize git repo**

Run: `cd c:/work/earth_revibe && git init`

**Step 2: Create root package.json**

```json
{
  "name": "earth-revibe",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "clean": "turbo clean",
    "db:generate": "turbo db:generate",
    "db:push": "turbo db:push",
    "db:seed": "turbo db:seed"
  },
  "devDependencies": {
    "turbo": "^2.8.13",
    "typescript": "^5.9.3"
  },
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=20"
  }
}
```

**Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Step 4: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    },
    "db:generate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

**Step 5: Create .gitignore**

```
# Dependencies
node_modules/

# Next.js
.next/
out/

# Build
dist/

# Environment
.env
.env.local
.env.*.local

# Prisma
packages/db/prisma/*.db

# Turbo
.turbo/

# IDE
.vscode/
!.vscode/settings.json
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/
```

**Step 6: Create .npmrc**

```
auto-install-peers=true
strict-peer-dependencies=false
```

**Step 7: Create directory structure**

Run:

```bash
mkdir -p apps/storefront apps/admin apps/api packages/shared/src packages/db/prisma packages/tsconfig
```

**Step 8: Commit**

```bash
git add -A && git commit -m "chore: initialize monorepo with Turborepo and pnpm workspaces"
```

---

### Task 2: Shared TypeScript Configs (`packages/tsconfig`)

**Files:**

- Create: `packages/tsconfig/package.json`
- Create: `packages/tsconfig/base.json`
- Create: `packages/tsconfig/nextjs.json`
- Create: `packages/tsconfig/node.json`

**Step 1: Create package.json**

```json
{
  "name": "@earth-revibe/tsconfig",
  "version": "0.0.0",
  "private": true,
  "license": "MIT",
  "publishConfig": {
    "access": "public"
  }
}
```

**Step 2: Create base.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create nextjs.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "noEmit": true,
    "plugins": [{ "name": "next" }]
  }
}
```

**Step 4: Create node.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false
  }
}
```

**Step 5: Commit**

```bash
git add packages/tsconfig/ && git commit -m "chore: add shared TypeScript configurations"
```

---

### Task 3: Shared Package - Enums (`packages/shared`)

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/enums/index.ts`
- Create: `packages/shared/src/enums/user.enum.ts`
- Create: `packages/shared/src/enums/product.enum.ts`
- Create: `packages/shared/src/enums/order.enum.ts`
- Create: `packages/shared/src/enums/payment.enum.ts`
- Create: `packages/shared/src/enums/discount.enum.ts`
- Create: `packages/shared/src/enums/blog.enum.ts`
- Create: `packages/shared/src/enums/support.enum.ts`
- Create: `packages/shared/src/enums/loyalty.enum.ts`
- Create: `packages/shared/src/enums/notification.enum.ts`

**Step 1: Create package.json**

```json
{
  "name": "@earth-revibe/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@earth-revibe/tsconfig": "workspace:*",
    "typescript": "^5.9.3"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "@earth-revibe/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create all enum files**

Create each enum file as defined in `docs/05-BACKEND-SCHEMA.md`:

- `user.enum.ts` — UserRole
- `product.enum.ts` — ProductStatus
- `order.enum.ts` — OrderStatus, ReturnStatus
- `payment.enum.ts` — PaymentStatus, PaymentMethod
- `discount.enum.ts` — DiscountType
- `blog.enum.ts` — BlogPostStatus
- `support.enum.ts` — TicketStatus, TicketPriority
- `loyalty.enum.ts` — LoyaltyTransactionType, ReferralStatus
- `notification.enum.ts` — NotificationType

Create barrel export in `enums/index.ts` and re-export from `src/index.ts`.

**Step 4: Build to verify**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/shared/ && git commit -m "feat: add shared package with all enums"
```

---

### Task 4: Shared Package - Zod Schemas

**Files:**

- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/schemas/auth.schema.ts`
- Create: `packages/shared/src/schemas/user.schema.ts`
- Create: `packages/shared/src/schemas/product.schema.ts`
- Create: `packages/shared/src/schemas/category.schema.ts`
- Create: `packages/shared/src/schemas/order.schema.ts`
- Create: `packages/shared/src/schemas/cart.schema.ts`
- Create: `packages/shared/src/schemas/review.schema.ts`
- Create: `packages/shared/src/schemas/discount.schema.ts`
- Create: `packages/shared/src/schemas/blog.schema.ts`
- Create: `packages/shared/src/schemas/support.schema.ts`
- Create: `packages/shared/src/schemas/loyalty.schema.ts`
- Create: `packages/shared/src/schemas/referral.schema.ts`
- Create: `packages/shared/src/schemas/settings.schema.ts`
- Create: `packages/shared/src/schemas/common.schema.ts`

**Step 1: Create common schema (pagination, API response)**

```typescript
// common.schema.ts
import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
  });

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .array(
        z.object({
          field: z.string().optional(),
          message: z.string(),
        })
      )
      .optional(),
  }),
});

export const idParamSchema = z.object({
  id: z.string().cuid(),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
```

**Step 2: Create auth schemas**

```typescript
// auth.schema.ts
import { z } from 'zod';

export const registerSchema = z
  .object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email(),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
      .optional(),
    password: z
      .string()
      .min(8)
      .max(100)
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[a-z]/, 'Must contain lowercase letter')
      .regex(/[0-9]/, 'Must contain number'),
    confirmPassword: z.string(),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8)
      .max(100)
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[a-z]/, 'Must contain lowercase letter')
      .regex(/[0-9]/, 'Must contain number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

**Step 3: Create remaining schemas** (product, category, order, cart, review, discount, blog, support, loyalty, referral, settings) following the same pattern — Zod schemas with inferred TypeScript types exported.

**Step 4: Create barrel exports**

`schemas/index.ts` re-exports all schemas. `src/index.ts` re-exports enums + schemas.

**Step 5: Build to verify**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add packages/shared/ && git commit -m "feat: add Zod validation schemas for all entities"
```

---

### Task 5: Shared Package - Constants & Utilities

**Files:**

- Create: `packages/shared/src/constants/index.ts`
- Create: `packages/shared/src/constants/sizes.ts`
- Create: `packages/shared/src/constants/colors.ts`
- Create: `packages/shared/src/constants/states.ts`
- Create: `packages/shared/src/utils/index.ts`
- Create: `packages/shared/src/utils/format.ts`
- Create: `packages/shared/src/utils/order.ts`
- Modify: `packages/shared/src/index.ts` — add constants and utils exports

**Step 1: Create constants** (product sizes, color options, Indian states for shipping)

**Step 2: Create utility functions** (formatPrice for INR, generateOrderNumber, generateTicketNumber, generateReferralCode)

**Step 3: Update barrel export**

**Step 4: Build to verify**

Run: `cd packages/shared && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add packages/shared/ && git commit -m "feat: add shared constants and utility functions"
```

---

### Task 6: Database Package (`packages/db`)

**Files:**

- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/seed.ts`

**Step 1: Create package.json**

```json
{
  "name": "@earth-revibe/db",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "dev": "tsc --watch",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx src/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^7.4.2"
  },
  "devDependencies": {
    "@earth-revibe/tsconfig": "workspace:*",
    "prisma": "^7.4.2",
    "tsx": "^4.19.0",
    "typescript": "^5.9.3"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "@earth-revibe/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create schema.prisma**

Full Prisma schema as defined in `docs/05-BACKEND-SCHEMA.md` — all models, enums, relations, indexes.

**Step 4: Create Prisma client singleton**

```typescript
// src/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Step 5: Create index.ts barrel export**

```typescript
// src/index.ts
export { prisma } from './client';
export * from '@prisma/client';
```

**Step 6: Create seed script** with:

- Super Admin user (admin@earthrevibe.com)
- 3 categories (Tops & Basics, Bottoms & Pants, Outerwear & Jackets)
- 6 sample products (2 per category) with variants and images
- Store settings defaults
- Loyalty config defaults
- Referral config defaults
- Shipping zones (North, South, East, West, Metro)

**Step 7: Commit**

```bash
git add packages/db/ && git commit -m "feat: add database package with Prisma schema and seed"
```

---

### Task 7: Storefront App Skeleton (`apps/storefront`)

**Files:**

- Create: `apps/storefront/package.json`
- Create: `apps/storefront/tsconfig.json`
- Create: `apps/storefront/next.config.ts`
- Create: `apps/storefront/src/app/layout.tsx`
- Create: `apps/storefront/src/app/page.tsx`
- Create: `apps/storefront/src/app/globals.css`
- Create: `apps/storefront/.env.local.example`

**Step 1: Create package.json with all storefront dependencies**

**Step 2: Create Next.js config with Turborepo transpile packages**

**Step 3: Create root layout** (html, body, fonts, metadata)

**Step 4: Create homepage placeholder** ("Earth Revibe — Coming Soon")

**Step 5: Create globals.css with Tailwind imports and CSS custom properties for design tokens**

**Step 6: Commit**

```bash
git add apps/storefront/ && git commit -m "feat: add storefront Next.js app skeleton"
```

---

### Task 8: Admin App Skeleton (`apps/admin`)

**Files:**

- Create: `apps/admin/package.json`
- Create: `apps/admin/tsconfig.json`
- Create: `apps/admin/next.config.ts`
- Create: `apps/admin/src/app/layout.tsx`
- Create: `apps/admin/src/app/page.tsx`
- Create: `apps/admin/src/app/globals.css`
- Create: `apps/admin/.env.local.example`

**Step 1: Create package.json with all admin dependencies**

**Step 2: Create Next.js config (port 3001)**

**Step 3: Create root layout (admin-specific, Deep Earth sidebar placeholder)**

**Step 4: Create homepage placeholder** ("Earth Revibe Admin")

**Step 5: Create globals.css with Tailwind + admin design tokens**

**Step 6: Commit**

```bash
git add apps/admin/ && git commit -m "feat: add admin Next.js app skeleton"
```

---

### Task 9: API App Skeleton (`apps/api`)

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/.env.example`

**Step 1: Create package.json with all API dependencies**

**Step 2: Create tsconfig.json extending node config**

**Step 3: Create env config with Zod validation**

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL: z.string().url().default('http://localhost:3001'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

**Step 4: Create Express app with middleware stack**

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

const app = express();

app.use(helmet());
app.use(cors({ origin: [env.FRONTEND_URL, env.ADMIN_URL], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Earth Revibe API is running' });
});

export { app };
```

**Step 5: Create entry point**

```typescript
// src/index.ts
import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`Earth Revibe API running on port ${env.PORT}`);
});
```

**Step 6: Commit**

```bash
git add apps/api/ && git commit -m "feat: add API Express app skeleton with health check"
```

---

### Task 10: Install Dependencies + Verify Full Build

**Step 1: Install all dependencies**

Run: `cd c:/work/earth_revibe && pnpm install`
Expected: All packages install successfully

**Step 2: Generate Prisma client**

Run: `pnpm db:generate`
Expected: Prisma Client generated

**Step 3: Build all packages**

Run: `pnpm build`
Expected: All 5 packages build without errors

**Step 4: Test API health check**

Run: Start API server, hit `GET /api/v1/health`
Expected: `{ "success": true, "message": "Earth Revibe API is running" }`

**Step 5: Test storefront dev**

Run: `cd apps/storefront && pnpm dev`
Expected: Next.js starts on port 3000

**Step 6: Test admin dev**

Run: `cd apps/admin && pnpm dev`
Expected: Next.js starts on port 3001

**Step 7: Final commit**

```bash
git add -A && git commit -m "chore: verify full monorepo build and dev servers"
```

---
