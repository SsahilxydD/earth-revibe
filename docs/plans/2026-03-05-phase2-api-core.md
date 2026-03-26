# Phase 2: API Core - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core API layer — middleware infrastructure, authentication, products CRUD, categories CRUD, and search.

**Architecture:** Express 5 REST API with layered architecture (routes -> controllers -> services -> Prisma). Zod validation middleware, JWT auth with refresh tokens, role-based access control.

**Tech Stack:** Express 5.2.1, Prisma 5.22, Zod 4.3.6, JWT, bcryptjs

---

### Task 1: API Middleware & Error Handling Infrastructure

Create the foundational middleware layer: Zod validation, centralized error handling, async route wrapper.

**Files:**

- Create: `apps/api/src/middleware/validate.ts`
- Create: `apps/api/src/middleware/error-handler.ts`
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/utils/api-error.ts`
- Create: `apps/api/src/utils/async-handler.ts`
- Create: `apps/api/src/types/express.d.ts`

---

### Task 2: Authentication API

Full auth flow: register, login, refresh, logout, forgot/reset password, get current user.

**Files:**

- Create: `apps/api/src/routes/auth.routes.ts`
- Create: `apps/api/src/controllers/auth.controller.ts`
- Create: `apps/api/src/services/auth.service.ts`
- Modify: `apps/api/src/app.ts` — mount auth routes

---

### Task 3: Products API

Full products CRUD with filtering, pagination, variants, and image management.

**Files:**

- Create: `apps/api/src/routes/product.routes.ts`
- Create: `apps/api/src/controllers/product.controller.ts`
- Create: `apps/api/src/services/product.service.ts`
- Modify: `apps/api/src/app.ts` — mount product routes

---

### Task 4: Categories API

Categories CRUD with nested tree support and reordering.

**Files:**

- Create: `apps/api/src/routes/category.routes.ts`
- Create: `apps/api/src/controllers/category.controller.ts`
- Create: `apps/api/src/services/category.service.ts`
- Modify: `apps/api/src/app.ts` — mount category routes

---

### Task 5: Search API

Product search with autocomplete suggestions.

**Files:**

- Create: `apps/api/src/routes/search.routes.ts`
- Create: `apps/api/src/controllers/search.controller.ts`
- Create: `apps/api/src/services/search.service.ts`
- Modify: `apps/api/src/app.ts` — mount search routes

---

### Task 6: Wire Up All Routes + Verify Build

Mount all routes in app.ts, verify TypeScript compiles, test health check still works.
