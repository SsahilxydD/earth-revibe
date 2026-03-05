# Phase 9: Blog/CMS & Support Tickets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a blog/CMS system (public listing, admin CRUD with draft/publish/schedule) and customer support ticket system (create/view tickets, admin management with messaging).

**Architecture:** Public blog routes serve published posts; admin blog routes handle CRUD. Customer support routes let users create/view their tickets; admin support routes handle all tickets with status/assignment. Prisma models, Zod schemas, and enums already exist.

**Tech Stack:** Express 5 + Prisma (API), Next.js 16 + React 19 + TanStack Query (Storefront & Admin)

---

### Task 1: API — Blog Service & Routes

**Files:**
- Create: `apps/api/src/services/blog.service.ts`
- Create: `apps/api/src/controllers/blog.controller.ts`
- Create: `apps/api/src/routes/blog.routes.ts`
- Create: `apps/api/src/controllers/admin-blog.controller.ts`
- Create: `apps/api/src/routes/admin-blog.routes.ts`

**Context:** BlogPost has authorId, slug (unique), status (DRAFT/PUBLISHED/SCHEDULED), categories/tags via junction tables. Public routes return only PUBLISHED posts. Admin routes need ADMIN/SUPER_ADMIN auth. Slugify title for auto-slug. Calculate readTime as words/200.

Storefront controllers: `res.json({ success: true, data: result })`
Admin controllers: `res.json({ success: true, ...result })` (spread pattern)

**Step 1: Create blog.service.ts**

```typescript
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { CreateBlogPostInput, UpdateBlogPostInput, CreateBlogCategoryInput, CreateBlogTagInput } from "@earth-revibe/shared";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function calcReadTime(content: string): number {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

export const blogService = {
  // Public: list published posts
  async listPublished(page: number = 1, limit: number = 12, categorySlug?: string) {
    const where: any = { status: "PUBLISHED", publishedAt: { lte: new Date() } };
    if (categorySlug) {
      where.categories = { some: { category: { slug: categorySlug } } };
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          publishedAt: true,
          readTime: true,
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // Public: get single published post
  async getPublishedBySlug(slug: string) {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!post || post.status !== "PUBLISHED") {
      throw ApiError.notFound("Blog post not found");
    }

    return post;
  },

  // Admin: list all posts
  async listAll(page: number = 1, limit: number = 20, status?: string, search?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // Admin: get post by ID
  async getById(id: string) {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });
    if (!post) throw ApiError.notFound("Blog post not found");
    return post;
  },

  // Admin: create post
  async create(authorId: string, data: CreateBlogPostInput) {
    const slug = data.slug || slugify(data.title);

    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) throw ApiError.conflict("A post with this slug already exists");

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        featuredImage: data.featuredImage,
        authorId,
        status: data.status || "DRAFT",
        publishedAt: data.status === "PUBLISHED" ? new Date() : data.publishedAt ? new Date(data.publishedAt) : undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        readTime: calcReadTime(data.content),
        categories: data.categoryIds?.length
          ? { create: data.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    return post;
  },

  // Admin: update post
  async update(id: string, data: UpdateBlogPostInput) {
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Blog post not found");

    if (data.slug && data.slug !== existing.slug) {
      const slugTaken = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
      if (slugTaken) throw ApiError.conflict("A post with this slug already exists");
    }

    // Handle category/tag updates by deleting and recreating
    if (data.categoryIds !== undefined) {
      await prisma.blogPostCategory.deleteMany({ where: { postId: id } });
    }
    if (data.tagIds !== undefined) {
      await prisma.blogPostTag.deleteMany({ where: { postId: id } });
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        featuredImage: data.featuredImage,
        status: data.status,
        publishedAt: data.status === "PUBLISHED" && !existing.publishedAt ? new Date() : data.publishedAt ? new Date(data.publishedAt) : undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        readTime: data.content ? calcReadTime(data.content) : undefined,
        categories: data.categoryIds?.length
          ? { create: data.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    return post;
  },

  // Admin: delete post
  async delete(id: string) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw ApiError.notFound("Blog post not found");
    await prisma.blogPost.delete({ where: { id } });
  },

  // Categories CRUD
  async listCategories() {
    return prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
  },

  async createCategory(data: CreateBlogCategoryInput) {
    const slug = data.slug || slugify(data.name);
    return prisma.blogCategory.create({ data: { name: data.name, slug } });
  },

  async deleteCategory(id: string) {
    await prisma.blogCategory.delete({ where: { id } });
  },

  // Tags CRUD
  async listTags() {
    return prisma.blogTag.findMany({ orderBy: { name: "asc" } });
  },

  async createTag(data: CreateBlogTagInput) {
    const slug = data.slug || slugify(data.name);
    return prisma.blogTag.create({ data: { name: data.name, slug } });
  },

  async deleteTag(id: string) {
    await prisma.blogTag.delete({ where: { id } });
  },
};
```

**Step 2: Create blog.controller.ts (public)**

```typescript
import type { Request, Response } from "express";
import { blogService } from "../services/blog.service";

export const blogController = {
  async listPublished(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const categorySlug = req.query.category as string | undefined;
    const result = await blogService.listPublished(page, limit, categorySlug);
    res.json({ success: true, data: result });
  },

  async getBySlug(req: Request, res: Response) {
    const slug = req.params.slug as string;
    const post = await blogService.getPublishedBySlug(slug);
    res.json({ success: true, data: post });
  },

  async listCategories(req: Request, res: Response) {
    const categories = await blogService.listCategories();
    res.json({ success: true, data: categories });
  },
};
```

**Step 3: Create blog.routes.ts (public)**

```typescript
import { Router, type IRouter } from "express";
import { blogController } from "../controllers/blog.controller";
import { asyncHandler } from "../utils/async-handler";

const router: IRouter = Router();

router.get("/", asyncHandler(blogController.listPublished));
router.get("/categories", asyncHandler(blogController.listCategories));
router.get("/:slug", asyncHandler(blogController.getBySlug));

export { router as blogRouter };
```

**Step 4: Create admin-blog.controller.ts**

```typescript
import type { Request, Response } from "express";
import { blogService } from "../services/blog.service";

export const adminBlogController = {
  async listAll(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const result = await blogService.listAll(page, limit, status, search);
    res.json({ success: true, ...result });
  },

  async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const post = await blogService.getById(id);
    res.json({ success: true, post });
  },

  async create(req: Request, res: Response) {
    const post = await blogService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, post });
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const post = await blogService.update(id, req.body);
    res.json({ success: true, post });
  },

  async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    await blogService.delete(id);
    res.json({ success: true, message: "Post deleted" });
  },

  async listCategories(_req: Request, res: Response) {
    const categories = await blogService.listCategories();
    res.json({ success: true, categories });
  },

  async createCategory(req: Request, res: Response) {
    const category = await blogService.createCategory(req.body);
    res.status(201).json({ success: true, category });
  },

  async deleteCategory(req: Request, res: Response) {
    const id = req.params.id as string;
    await blogService.deleteCategory(id);
    res.json({ success: true, message: "Category deleted" });
  },

  async listTags(_req: Request, res: Response) {
    const tags = await blogService.listTags();
    res.json({ success: true, tags });
  },

  async createTag(req: Request, res: Response) {
    const tag = await blogService.createTag(req.body);
    res.status(201).json({ success: true, tag });
  },

  async deleteTag(req: Request, res: Response) {
    const id = req.params.id as string;
    await blogService.deleteTag(id);
    res.json({ success: true, message: "Tag deleted" });
  },
};
```

**Step 5: Create admin-blog.routes.ts**

```typescript
import { Router, type IRouter } from "express";
import { adminBlogController } from "../controllers/admin-blog.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { createBlogPostSchema, updateBlogPostSchema, createBlogCategorySchema, createBlogTagSchema } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize("ADMIN", "SUPER_ADMIN"));

// Posts
router.get("/", asyncHandler(adminBlogController.listAll));
router.get("/:id", asyncHandler(adminBlogController.getById));
router.post("/", validate({ body: createBlogPostSchema }), asyncHandler(adminBlogController.create));
router.put("/:id", validate({ body: updateBlogPostSchema }), asyncHandler(adminBlogController.update));
router.delete("/:id", asyncHandler(adminBlogController.delete));

// Categories
router.get("/categories/list", asyncHandler(adminBlogController.listCategories));
router.post("/categories", validate({ body: createBlogCategorySchema }), asyncHandler(adminBlogController.createCategory));
router.delete("/categories/:id", asyncHandler(adminBlogController.deleteCategory));

// Tags
router.get("/tags/list", asyncHandler(adminBlogController.listTags));
router.post("/tags", validate({ body: createBlogTagSchema }), asyncHandler(adminBlogController.createTag));
router.delete("/tags/:id", asyncHandler(adminBlogController.deleteTag));

export { router as adminBlogRouter };
```

---

### Task 2: API — Support Service & Routes

**Files:**
- Create: `apps/api/src/services/support.service.ts`
- Create: `apps/api/src/controllers/support.controller.ts`
- Create: `apps/api/src/routes/support.routes.ts`
- Create: `apps/api/src/controllers/admin-support.controller.ts`
- Create: `apps/api/src/routes/admin-support.routes.ts`

**Context:** SupportTicket has ticketNumber (unique), userId, subject, category, status (OPEN/IN_PROGRESS/RESOLVED/CLOSED), priority (LOW/MEDIUM/HIGH/URGENT), assignedTo. TicketMessage has ticketId, userId, content, attachment. Customer routes see only own tickets. Admin routes see all. Generate ticketNumber like `TKT-XXXXXX`.

**Step 1: Create support.service.ts**

```typescript
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { CreateTicketInput, CreateTicketMessageInput, TicketQuery } from "@earth-revibe/shared";

function generateTicketNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TKT-${code}`;
}

export const supportService = {
  // Customer: create ticket
  async createTicket(userId: string, data: CreateTicketInput) {
    const ticketNumber = generateTicketNumber();

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject: data.subject,
        category: data.category,
        messages: {
          create: {
            userId,
            content: data.description,
            attachment: data.attachment,
          },
        },
      },
      include: {
        messages: { include: { user: { select: { firstName: true, lastName: true, role: true } } } },
      },
    });

    return ticket;
  },

  // Customer: list own tickets
  async listMyTickets(userId: string, page: number = 1, limit: number = 20, status?: string) {
    const where: any = { userId };
    if (status) where.status = status;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: { _count: { select: { messages: true } } },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // Customer: get own ticket detail
  async getMyTicket(userId: string, ticketNumber: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketNumber },
      include: {
        messages: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket || ticket.userId !== userId) {
      throw ApiError.notFound("Ticket not found");
    }

    return ticket;
  },

  // Customer: add message to own ticket
  async addMessage(userId: string, ticketNumber: string, data: CreateTicketMessageInput) {
    const ticket = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
    if (!ticket || ticket.userId !== userId) {
      throw ApiError.notFound("Ticket not found");
    }
    if (ticket.status === "CLOSED") {
      throw ApiError.badRequest("Cannot reply to a closed ticket");
    }

    // Reopen if resolved
    const statusUpdate = ticket.status === "RESOLVED" ? "OPEN" : undefined;

    const [message] = await Promise.all([
      prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          userId,
          content: data.content,
          attachment: data.attachment,
        },
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      }),
      statusUpdate
        ? prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: statusUpdate } })
        : prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } }),
    ]);

    return message;
  },

  // Admin: list all tickets
  async listAllTickets(query: TicketQuery & { search?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.search) {
      where.OR = [
        { ticketNumber: { contains: query.search, mode: "insensitive" } },
        { subject: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        take: query.limit || 20,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    const page = query.page || 1;
    const limit = query.limit || 20;
    return { tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // Admin: get ticket detail
  async getTicket(ticketNumber: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketNumber },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        messages: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!ticket) throw ApiError.notFound("Ticket not found");
    return ticket;
  },

  // Admin: update status
  async updateStatus(ticketNumber: string, status: string) {
    const ticket = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
    if (!ticket) throw ApiError.notFound("Ticket not found");

    return prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: status as any },
    });
  },

  // Admin: assign ticket
  async assignTicket(ticketNumber: string, assignedTo: string) {
    const ticket = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
    if (!ticket) throw ApiError.notFound("Ticket not found");

    return prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { assignedTo, status: ticket.status === "OPEN" ? "IN_PROGRESS" : undefined },
    });
  },

  // Admin: reply to ticket
  async adminReply(userId: string, ticketNumber: string, data: CreateTicketMessageInput) {
    const ticket = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
    if (!ticket) throw ApiError.notFound("Ticket not found");

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId,
        content: data.content,
        attachment: data.attachment,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });

    // Auto-set to IN_PROGRESS if OPEN
    if (ticket.status === "OPEN") {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "IN_PROGRESS" },
      });
    }

    return message;
  },
};
```

**Step 2: Create support.controller.ts (customer)**

```typescript
import type { Request, Response } from "express";
import { supportService } from "../services/support.service";

export const supportController = {
  async createTicket(req: Request, res: Response) {
    const ticket = await supportService.createTicket(req.user!.id, req.body);
    res.status(201).json({ success: true, data: ticket });
  },

  async listMyTickets(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const result = await supportService.listMyTickets(req.user!.id, page, limit, status);
    res.json({ success: true, data: result });
  },

  async getMyTicket(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const ticket = await supportService.getMyTicket(req.user!.id, ticketNumber);
    res.json({ success: true, data: ticket });
  },

  async addMessage(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const message = await supportService.addMessage(req.user!.id, ticketNumber, req.body);
    res.status(201).json({ success: true, data: message });
  },
};
```

**Step 3: Create support.routes.ts (customer)**

```typescript
import { Router, type IRouter } from "express";
import { supportController } from "../controllers/support.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { createTicketSchema, createTicketMessageSchema } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);

router.post("/", validate({ body: createTicketSchema }), asyncHandler(supportController.createTicket));
router.get("/", asyncHandler(supportController.listMyTickets));
router.get("/:ticketNumber", asyncHandler(supportController.getMyTicket));
router.post("/:ticketNumber/messages", validate({ body: createTicketMessageSchema }), asyncHandler(supportController.addMessage));

export { router as supportRouter };
```

**Step 4: Create admin-support.controller.ts**

```typescript
import type { Request, Response } from "express";
import { supportService } from "../services/support.service";

export const adminSupportController = {
  async listAll(req: Request, res: Response) {
    const query = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status: req.query.status as string | undefined,
      priority: req.query.priority as string | undefined,
      search: req.query.search as string | undefined,
    };
    const result = await supportService.listAllTickets(query as any);
    res.json({ success: true, ...result });
  },

  async getTicket(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const ticket = await supportService.getTicket(ticketNumber);
    res.json({ success: true, ticket });
  },

  async updateStatus(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const ticket = await supportService.updateStatus(ticketNumber, req.body.status);
    res.json({ success: true, ticket });
  },

  async assignTicket(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const ticket = await supportService.assignTicket(ticketNumber, req.body.assignedTo);
    res.json({ success: true, ticket });
  },

  async reply(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const message = await supportService.adminReply(req.user!.id, ticketNumber, req.body);
    res.status(201).json({ success: true, message });
  },
};
```

**Step 5: Create admin-support.routes.ts**

```typescript
import { Router, type IRouter } from "express";
import { adminSupportController } from "../controllers/admin-support.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { updateTicketStatusSchema, assignTicketSchema, createTicketMessageSchema } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize("ADMIN", "SUPER_ADMIN", "SUPPORT_STAFF"));

router.get("/", asyncHandler(adminSupportController.listAll));
router.get("/:ticketNumber", asyncHandler(adminSupportController.getTicket));
router.put("/:ticketNumber/status", validate({ body: updateTicketStatusSchema }), asyncHandler(adminSupportController.updateStatus));
router.put("/:ticketNumber/assign", validate({ body: assignTicketSchema }), asyncHandler(adminSupportController.assignTicket));
router.post("/:ticketNumber/messages", validate({ body: createTicketMessageSchema }), asyncHandler(adminSupportController.reply));

export { router as adminSupportRouter };
```

---

### Task 3: Mount Routers & Update Admin Sidebar

**Files:**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/admin/src/components/layout/sidebar.tsx`

**Step 1: Mount routers in app.ts**

Add imports:
```typescript
import { blogRouter } from "./routes/blog.routes";
import { adminBlogRouter } from "./routes/admin-blog.routes";
import { supportRouter } from "./routes/support.routes";
import { adminSupportRouter } from "./routes/admin-support.routes";
```

Add routes (before admin routes section):
```typescript
app.use("/api/v1/blog", blogRouter);
app.use("/api/v1/support", supportRouter);
app.use("/api/v1/admin/blog", adminBlogRouter);
app.use("/api/v1/admin/support", adminSupportRouter);
```

**Step 2: Update admin sidebar**

Add imports to sidebar.tsx: `FileText, Headset` from lucide-react.

Update navItems array — add after Customers:
```typescript
{ label: "Blog", href: "/blog", icon: FileText },
{ label: "Support", href: "/support-tickets", icon: Headset },
```

---

### Task 4: Admin — Blog Management Pages

**Files:**
- Create: `apps/admin/src/hooks/use-blog.ts`
- Create: `apps/admin/src/app/(admin)/blog/page.tsx`
- Create: `apps/admin/src/app/(admin)/blog/new/page.tsx`
- Create: `apps/admin/src/app/(admin)/blog/[id]/edit/page.tsx`

**Context:** Admin api-client returns the full response (not `json.data`). Admin UI has Select, Textarea, Input, Button, Badge, Card, Modal, Spinner, Skeleton, toast. Use `use(params)` for dynamic routes in Next.js 16.

**Step 1: Create use-blog.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "@/components/ui";

export function useBlogPosts(page: number = 1, status?: string, search?: string) {
  return useQuery({
    queryKey: ["admin-blog-posts", page, status, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      return api.get(`/admin/blog?${params}`);
    },
  });
}

export function useBlogPost(id: string) {
  return useQuery({
    queryKey: ["admin-blog-post", id],
    queryFn: () => api.get(`/admin/blog/${id}`),
    enabled: !!id,
  });
}

export function useBlogCategories() {
  return useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: () => api.get("/admin/blog/categories/list"),
  });
}

export function useBlogTags() {
  return useQuery({
    queryKey: ["admin-blog-tags"],
    queryFn: () => api.get("/admin/blog/tags/list"),
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/admin/blog", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Blog post created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create post"),
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/admin/blog/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["admin-blog-post"] });
      toast.success("Blog post updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update post"),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/blog/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Blog post deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete post"),
  });
}

export function useCreateBlogCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/admin/blog/categories", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-categories"] });
      toast.success("Category created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create category"),
  });
}

export function useCreateBlogTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/admin/blog/tags", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-tags"] });
      toast.success("Tag created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create tag"),
  });
}
```

**Step 2: Create blog list page (page.tsx)**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";
import { Button, Badge, Card, Input, Select, Skeleton, toast } from "@/components/ui";
import { useBlogPosts, useDeleteBlogPost } from "@/hooks/use-blog";

const statusVariant: Record<string, "success" | "warning" | "default"> = {
  PUBLISHED: "success",
  SCHEDULED: "warning",
  DRAFT: "default",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function BlogListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useBlogPosts(page, status || undefined, search || undefined);
  const deleteMutation = useDeleteBlogPost();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">Blog Posts</h1>
        <Link href="/blog/new">
          <Button><Plus size={16} /> New Post</Button>
        </Link>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <Input
              placeholder="Search posts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="SCHEDULED">Scheduled</option>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !data?.posts?.length ? (
          <p className="text-medium-gray py-8 text-center">No blog posts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-gray text-left">
                  <th className="py-3 px-2 font-medium text-medium-gray">Title</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Status</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Date</th>
                  <th className="py-3 px-2 font-medium text-medium-gray w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.posts.map((post: any) => (
                  <tr key={post.id} className="border-b border-light-gray hover:bg-off-white/50">
                    <td className="py-3 px-2">
                      <p className="font-medium text-charcoal">{post.title}</p>
                      <p className="text-xs text-medium-gray">/{post.slug}</p>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant[post.status] || "default"}>{post.status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-medium-gray">
                      {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        {post.status === "PUBLISHED" && (
                          <a href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000"}/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm"><Eye size={14} /></Button>
                          </a>
                        )}
                        <Link href={`/blog/${post.id}/edit`}>
                          <Button variant="ghost" size="sm"><Edit2 size={14} /></Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete this post?")) deleteMutation.mutate(post.id);
                          }}
                        >
                          <Trash2 size={14} className="text-error" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-light-gray">
            <p className="text-xs text-medium-gray">Page {data.page} of {data.totalPages} ({data.total} posts)</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
```

**Step 3: Create blog new/edit pages**

Create `apps/admin/src/app/(admin)/blog/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { useCreateBlogPost, useBlogCategories, useBlogTags } from "@/hooks/use-blog";

export default function NewBlogPostPage() {
  const router = useRouter();
  const createMutation = useCreateBlogPost();
  const { data: catData } = useBlogCategories();
  const { data: tagData } = useBlogTags();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    status: "DRAFT",
    metaTitle: "",
    metaDescription: "",
    categoryIds: [] as string[],
    tagIds: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      slug: form.slug || undefined,
      excerpt: form.excerpt || undefined,
      featuredImage: form.featuredImage || undefined,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      categoryIds: form.categoryIds.length ? form.categoryIds : undefined,
      tagIds: form.tagIds.length ? form.tagIds : undefined,
    };
    const result = await createMutation.mutateAsync(payload);
    if (result?.post) router.push("/blog");
  };

  const toggleArray = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/blog"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
        <h1 className="text-2xl font-semibold text-charcoal">New Blog Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Slug (auto-generated if empty)</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="my-blog-post" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Excerpt</label>
              <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Content *</label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={12} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Featured Image URL</label>
              <Input value={form.featuredImage} onChange={(e) => setForm({ ...form, featuredImage: e.target.value })} placeholder="https://..." />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">Publishing</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
              </Select>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">Categories & Tags</h3>
          <div className="space-y-4">
            {catData?.categories?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {catData.categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm({ ...form, categoryIds: toggleArray(form.categoryIds, cat.id) })}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.categoryIds.includes(cat.id)
                          ? "bg-deep-earth text-white border-deep-earth"
                          : "bg-white text-charcoal border-light-gray hover:border-deep-earth"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tagData?.tags?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {tagData.tags.map((tag: any) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setForm({ ...form, tagIds: toggleArray(form.tagIds, tag.id) })}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.tagIds.includes(tag.id)
                          ? "bg-deep-earth text-white border-deep-earth"
                          : "bg-white text-charcoal border-light-gray hover:border-deep-earth"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">SEO</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Meta Title</label>
              <Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} maxLength={70} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Meta Description</label>
              <Textarea value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} rows={2} maxLength={160} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/blog"><Button variant="secondary">Cancel</Button></Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

Create `apps/admin/src/app/(admin)/blog/[id]/edit/page.tsx`:

```tsx
"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button, Card, Input, Select, Textarea, Spinner } from "@/components/ui";
import { useBlogPost, useUpdateBlogPost, useBlogCategories, useBlogTags } from "@/hooks/use-blog";

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useBlogPost(id);
  const updateMutation = useUpdateBlogPost();
  const { data: catData } = useBlogCategories();
  const { data: tagData } = useBlogTags();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    status: "DRAFT",
    metaTitle: "",
    metaDescription: "",
    categoryIds: [] as string[],
    tagIds: [] as string[],
  });

  useEffect(() => {
    if (data?.post) {
      const p = data.post;
      setForm({
        title: p.title || "",
        slug: p.slug || "",
        excerpt: p.excerpt || "",
        content: p.content || "",
        featuredImage: p.featuredImage || "",
        status: p.status || "DRAFT",
        metaTitle: p.metaTitle || "",
        metaDescription: p.metaDescription || "",
        categoryIds: p.categories?.map((c: any) => c.categoryId) || [],
        tagIds: p.tags?.map((t: any) => t.tagId) || [],
      });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      excerpt: form.excerpt || undefined,
      featuredImage: form.featuredImage || undefined,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      categoryIds: form.categoryIds.length ? form.categoryIds : [],
      tagIds: form.tagIds.length ? form.tagIds : [],
    };
    await updateMutation.mutateAsync({ id, data: payload });
    router.push("/blog");
  };

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/blog"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
        <h1 className="text-2xl font-semibold text-charcoal">Edit Blog Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Slug</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Excerpt</label>
              <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Content *</label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={12} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Featured Image URL</label>
              <Input value={form.featuredImage} onChange={(e) => setForm({ ...form, featuredImage: e.target.value })} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">Publishing</h3>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="SCHEDULED">Scheduled</option>
          </Select>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">Categories & Tags</h3>
          <div className="space-y-4">
            {catData?.categories?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {catData.categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm({ ...form, categoryIds: toggleArray(form.categoryIds, cat.id) })}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.categoryIds.includes(cat.id)
                          ? "bg-deep-earth text-white border-deep-earth"
                          : "bg-white text-charcoal border-light-gray hover:border-deep-earth"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tagData?.tags?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {tagData.tags.map((tag: any) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setForm({ ...form, tagIds: toggleArray(form.tagIds, tag.id) })}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.tagIds.includes(tag.id)
                          ? "bg-deep-earth text-white border-deep-earth"
                          : "bg-white text-charcoal border-light-gray hover:border-deep-earth"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">SEO</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Meta Title</label>
              <Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} maxLength={70} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Meta Description</label>
              <Textarea value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} rows={2} maxLength={160} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/blog"><Button variant="secondary">Cancel</Button></Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

---

### Task 5: Admin — Support Tickets Pages

**Files:**
- Create: `apps/admin/src/hooks/use-support-tickets.ts`
- Create: `apps/admin/src/app/(admin)/support-tickets/page.tsx`
- Create: `apps/admin/src/app/(admin)/support-tickets/[ticketNumber]/page.tsx`

**Context:** Admin api-client spread pattern. Ticket has ticketNumber, subject, category, status, priority, user, messages. Admin can update status, assign, and reply.

**Step 1: Create use-support-tickets.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "@/components/ui";

export function useAdminTickets(page: number = 1, status?: string, priority?: string, search?: string) {
  return useQuery({
    queryKey: ["admin-tickets", page, status, priority, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (search) params.set("search", search);
      return api.get(`/admin/support?${params}`);
    },
  });
}

export function useAdminTicket(ticketNumber: string) {
  return useQuery({
    queryKey: ["admin-ticket", ticketNumber],
    queryFn: () => api.get(`/admin/support/${ticketNumber}`),
    enabled: !!ticketNumber,
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketNumber, status }: { ticketNumber: string; status: string }) =>
      api.put(`/admin/support/${ticketNumber}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      qc.invalidateQueries({ queryKey: ["admin-ticket"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update status"),
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketNumber, assignedTo }: { ticketNumber: string; assignedTo: string }) =>
      api.put(`/admin/support/${ticketNumber}/assign`, { assignedTo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      qc.invalidateQueries({ queryKey: ["admin-ticket"] });
      toast.success("Ticket assigned");
    },
    onError: (err: any) => toast.error(err.message || "Failed to assign"),
  });
}

export function useAdminTicketReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketNumber, content }: { ticketNumber: string; content: string }) =>
      api.post(`/admin/support/${ticketNumber}/messages`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ticket"] });
      toast.success("Reply sent");
    },
    onError: (err: any) => toast.error(err.message || "Failed to send reply"),
  });
}
```

**Step 2: Create support tickets list page**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button, Badge, Card, Input, Select, Skeleton } from "@/components/ui";
import { useAdminTickets } from "@/hooks/use-support-tickets";

const statusVariant: Record<string, "success" | "warning" | "info" | "error" | "default"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "default",
};

const priorityVariant: Record<string, "success" | "warning" | "error" | "default"> = {
  LOW: "default",
  MEDIUM: "warning",
  HIGH: "error",
  URGENT: "error",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SupportTicketsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useAdminTickets(page, status || undefined, priority || undefined, search || undefined);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">Support Tickets</h1>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <Input placeholder="Search tickets..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </Select>
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !data?.tickets?.length ? (
          <p className="text-medium-gray py-8 text-center">No tickets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-gray text-left">
                  <th className="py-3 px-2 font-medium text-medium-gray">Ticket</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Customer</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Category</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Status</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Priority</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Updated</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Msgs</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map((ticket: any) => (
                  <tr key={ticket.id} className="border-b border-light-gray hover:bg-off-white/50">
                    <td className="py-3 px-2">
                      <Link href={`/support-tickets/${ticket.ticketNumber}`} className="text-deep-earth hover:underline font-medium">
                        {ticket.ticketNumber}
                      </Link>
                      <p className="text-xs text-medium-gray truncate max-w-[200px]">{ticket.subject}</p>
                    </td>
                    <td className="py-3 px-2 text-charcoal">
                      {ticket.user?.firstName} {ticket.user?.lastName}
                    </td>
                    <td className="py-3 px-2 text-medium-gray">{ticket.category}</td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant[ticket.status] || "default"}>{ticket.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={priorityVariant[ticket.priority] || "default"}>{ticket.priority}</Badge>
                    </td>
                    <td className="py-3 px-2 text-medium-gray">{formatDate(ticket.updatedAt)}</td>
                    <td className="py-3 px-2">
                      <span className="flex items-center gap-1 text-medium-gray">
                        <MessageSquare size={14} /> {ticket._count?.messages || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-light-gray">
            <p className="text-xs text-medium-gray">Page {data.page} of {data.totalPages} ({data.total} tickets)</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
```

**Step 3: Create support ticket detail page**

```tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, User } from "lucide-react";
import { Button, Badge, Card, Select, Textarea, Spinner } from "@/components/ui";
import { useAdminTicket, useUpdateTicketStatus, useAdminTicketReply } from "@/hooks/use-support-tickets";

const statusVariant: Record<string, "success" | "warning" | "info" | "default"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "default",
};

const priorityVariant: Record<string, "success" | "warning" | "error" | "default"> = {
  LOW: "default",
  MEDIUM: "warning",
  HIGH: "error",
  URGENT: "error",
};

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminTicketDetailPage({ params }: { params: Promise<{ ticketNumber: string }> }) {
  const { ticketNumber } = use(params);
  const { data, isLoading } = useAdminTicket(ticketNumber);
  const statusMutation = useUpdateTicketStatus();
  const replyMutation = useAdminTicketReply();
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const ticket = data?.ticket;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await replyMutation.mutateAsync({ ticketNumber, content: reply });
    setReply("");
  };

  const handleStatusChange = () => {
    if (newStatus && newStatus !== ticket?.status) {
      statusMutation.mutate({ ticketNumber, status: newStatus });
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!ticket) return <p className="text-center py-20 text-medium-gray">Ticket not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/support-tickets"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
        <h1 className="text-2xl font-semibold text-charcoal">{ticket.ticketNumber}</h1>
        <Badge variant={statusVariant[ticket.status] || "default"}>{ticket.status.replace("_", " ")}</Badge>
        <Badge variant={priorityVariant[ticket.priority] || "default"}>{ticket.priority}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-1">{ticket.subject}</h3>
            <p className="text-xs text-medium-gray mb-4">Category: {ticket.category}</p>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {ticket.messages?.map((msg: any) => {
                const isStaff = msg.user?.role === "ADMIN" || msg.user?.role === "SUPER_ADMIN" || msg.user?.role === "SUPPORT_STAFF";
                return (
                  <div key={msg.id} className={`flex gap-3 ${isStaff ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isStaff ? "bg-deep-earth" : "bg-forest-green/10"}`}>
                      <User size={14} className={isStaff ? "text-white" : "text-forest-green"} />
                    </div>
                    <div className={`max-w-[75%] ${isStaff ? "text-right" : ""}`}>
                      <div className={`rounded-lg px-4 py-3 ${isStaff ? "bg-deep-earth/5" : "bg-off-white"}`}>
                        <p className="text-sm text-charcoal whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <p className="text-[10px] text-medium-gray mt-1">
                        {msg.user?.firstName} {msg.user?.lastName} &middot; {formatDateTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {ticket.status !== "CLOSED" && (
            <Card>
              <form onSubmit={handleReply} className="space-y-3">
                <Textarea
                  placeholder="Type your reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={replyMutation.isPending || !reply.trim()}>
                    <Send size={14} /> {replyMutation.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <h4 className="text-sm font-semibold text-charcoal mb-3">Customer</h4>
            <p className="text-sm text-charcoal">{ticket.user?.firstName} {ticket.user?.lastName}</p>
            <p className="text-xs text-medium-gray">{ticket.user?.email}</p>
          </Card>

          <Card>
            <h4 className="text-sm font-semibold text-charcoal mb-3">Update Status</h4>
            <div className="space-y-2">
              <Select value={newStatus || ticket.status} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </Select>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleStatusChange}
                disabled={statusMutation.isPending || !newStatus || newStatus === ticket.status}
              >
                Update
              </Button>
            </div>
          </Card>

          <Card>
            <h4 className="text-sm font-semibold text-charcoal mb-3">Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-medium-gray">Created</span>
                <span className="text-charcoal">{formatDateTime(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-medium-gray">Updated</span>
                <span className="text-charcoal">{formatDateTime(ticket.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-medium-gray">Messages</span>
                <span className="text-charcoal">{ticket.messages?.length || 0}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 6: Storefront — Blog Pages

**Files:**
- Create: `apps/storefront/src/app/(shop)/blog/page.tsx`
- Create: `apps/storefront/src/app/(shop)/blog/[slug]/page.tsx`

**Context:** Storefront api-client returns `json.data`. Public blog endpoints: `GET /blog?page=N&limit=N&category=slug`, `GET /blog/:slug`, `GET /blog/categories`. Uses Button, Card, Badge, Skeleton from storefront UI.

**Step 1: Create blog list page**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Card, Badge, Skeleton } from "@/components/ui";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPage() {
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("");

  const { data: categoriesData } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: () => api.get("/blog/categories"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["blog-posts", page, activeCategory],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (activeCategory) params.set("category", activeCategory);
      return api.get(`/blog?${params}`);
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl lg:text-4xl font-heading font-bold text-charcoal">Our Blog</h1>
        <p className="text-medium-gray mt-2 max-w-xl mx-auto">
          Stories about sustainable fashion, eco-friendly living, and the journey behind Earth Revibe.
        </p>
      </div>

      {/* Categories */}
      {categoriesData?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => { setActiveCategory(""); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !activeCategory ? "bg-forest-green text-white" : "bg-off-white text-charcoal hover:bg-cream"
            }`}
          >
            All
          </button>
          {categoriesData.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.slug); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.slug ? "bg-forest-green text-white" : "bg-off-white text-charcoal hover:bg-cream"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Posts */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
        </div>
      ) : !data?.posts?.length ? (
        <p className="text-center text-medium-gray py-16">No blog posts yet. Check back soon!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.posts.map((post: any) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group">
              <div className="bg-white rounded-xl border border-light-gray overflow-hidden hover:shadow-md transition-shadow">
                {post.featuredImage ? (
                  <div className="relative h-48 bg-off-white">
                    <Image src={post.featuredImage} alt={post.title} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-forest-green/10 to-sage/20 flex items-center justify-center">
                    <span className="text-4xl">🌿</span>
                  </div>
                )}
                <div className="p-5">
                  {post.categories?.length > 0 && (
                    <div className="flex gap-1 mb-2">
                      {post.categories.slice(0, 2).map((pc: any) => (
                        <Badge key={pc.category.id} variant="default">{pc.category.name}</Badge>
                      ))}
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-charcoal group-hover:text-forest-green transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-medium-gray mt-2 line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1 text-xs text-medium-gray">
                      <Clock size={12} />
                      <span>{post.readTime || 1} min read</span>
                    </div>
                    <span className="text-xs text-medium-gray">{formatDate(post.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-medium-gray">Page {data.page} of {data.totalPages}</span>
          <Button variant="ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create blog post detail page**

```tsx
"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Badge, Spinner } from "@/components/ui";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => api.get(`/blog/${slug}`),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!post) return <p className="text-center py-20 text-medium-gray">Post not found.</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-medium-gray hover:text-forest-green mb-6">
        <ArrowLeft size={16} /> Back to Blog
      </Link>

      {post.categories?.length > 0 && (
        <div className="flex gap-2 mb-3">
          {post.categories.map((pc: any) => (
            <Badge key={pc.category.id} variant="default">{pc.category.name}</Badge>
          ))}
        </div>
      )}

      <h1 className="text-3xl lg:text-4xl font-heading font-bold text-charcoal mb-4">{post.title}</h1>

      <div className="flex items-center gap-4 text-sm text-medium-gray mb-8">
        <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(post.publishedAt)}</span>
        <span className="flex items-center gap-1"><Clock size={14} /> {post.readTime || 1} min read</span>
      </div>

      {post.featuredImage && (
        <div className="relative h-64 sm:h-80 lg:h-96 rounded-xl overflow-hidden mb-8">
          <Image src={post.featuredImage} alt={post.title} fill className="object-cover" />
        </div>
      )}

      <article className="prose prose-lg max-w-none text-charcoal prose-headings:text-charcoal prose-a:text-forest-green">
        {post.content.split("\n").map((para: string, i: number) => (
          para.trim() ? <p key={i}>{para}</p> : null
        ))}
      </article>

      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-light-gray">
          {post.tags.map((pt: any) => (
            <span key={pt.tag.id} className="px-3 py-1 bg-off-white rounded-full text-xs text-medium-gray">
              #{pt.tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Task 7: Storefront — Support Tickets Pages

**Files:**
- Create: `apps/storefront/src/app/(shop)/account/support/page.tsx`
- Create: `apps/storefront/src/app/(shop)/account/support/[ticketNumber]/page.tsx`

**Context:** Storefront api-client returns `json.data`. Customer endpoints: `POST /support`, `GET /support?page=N&status=X`, `GET /support/:ticketNumber`, `POST /support/:ticketNumber/messages`. Account layout sidebar already exists. Use native `<select>` (storefront has no Select component). Add "Support" link to account layout sidebar navigation.

**Step 1: Modify account layout to add Support nav item**

In `apps/storefront/src/app/(shop)/account/layout.tsx`, add to the nav items array:
```typescript
{ label: "Support", href: "/account/support", icon: Headset },
```
Import `Headset` from lucide-react.

**Step 2: Create support tickets list/create page**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MessageSquare, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Card, Badge, Input, Skeleton } from "@/components/ui";
import { toast } from "@/components/ui/toast";

const statusVariant: Record<string, "success" | "warning" | "info" | "default"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "default",
};

const categories = ["Order Issue", "Payment", "Shipping", "Returns & Refunds", "Product Question", "Account", "Other"];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SupportPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "Order Issue", description: "" });

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-tickets", page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) params.set("status", statusFilter);
      return api.get(`/support?${params}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/support", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      toast.success("Ticket created! We'll get back to you soon.");
      setShowForm(false);
      setForm({ subject: "", category: "Order Issue", description: "" });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create ticket"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">Support</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Ticket</>}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">Create a Support Ticket</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Subject *</label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief description of your issue"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-light-gray px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest-green/20 focus:border-forest-green"
              >
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                required
                className="w-full rounded-lg border border-light-gray px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest-green/20 focus:border-forest-green resize-none"
                placeholder="Describe your issue in detail..."
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-light-gray px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest-green/20 focus:border-forest-green"
        >
          <option value="">All Tickets</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Tickets list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !data?.tickets?.length ? (
        <Card>
          <div className="text-center py-8">
            <MessageSquare size={40} className="mx-auto text-light-gray mb-3" />
            <p className="text-medium-gray">No support tickets yet.</p>
            <p className="text-sm text-medium-gray mt-1">Need help? Create a ticket above.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.tickets.map((ticket: any) => (
            <Link key={ticket.id} href={`/account/support/${ticket.ticketNumber}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-medium-gray">{ticket.ticketNumber}</span>
                      <Badge variant={statusVariant[ticket.status] || "default"}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-charcoal">{ticket.subject}</h3>
                    <p className="text-xs text-medium-gray mt-1">{ticket.category} &middot; {formatDate(ticket.updatedAt)}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-medium-gray">
                    <MessageSquare size={12} /> {ticket._count?.messages || 0}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-xs text-medium-gray">Page {data.page} of {data.totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create ticket detail page**

```tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Button, Card, Badge, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";

const statusVariant: Record<string, "success" | "warning" | "info" | "default"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "default",
};

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function TicketDetailPage({ params }: { params: Promise<{ ticketNumber: string }> }) {
  const { ticketNumber } = use(params);
  const { user } = useAuthStore();
  const [reply, setReply] = useState("");
  const qc = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["my-ticket", ticketNumber],
    queryFn: () => api.get(`/support/${ticketNumber}`),
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => api.post(`/support/${ticketNumber}/messages`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ticket", ticketNumber] });
      toast.success("Message sent");
      setReply("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to send message"),
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    replyMutation.mutate(reply);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!ticket) return <p className="text-center py-20 text-medium-gray">Ticket not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/account/support">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-charcoal">{ticket.ticketNumber}</h1>
            <Badge variant={statusVariant[ticket.status] || "default"}>{ticket.status.replace("_", " ")}</Badge>
          </div>
          <p className="text-sm text-medium-gray">{ticket.category}</p>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-charcoal mb-4">{ticket.subject}</h2>

        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {ticket.messages?.map((msg: any) => {
            const isMe = msg.user?.id === user?.id;
            const isStaff = msg.user?.role === "ADMIN" || msg.user?.role === "SUPER_ADMIN" || msg.user?.role === "SUPPORT_STAFF";
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isStaff ? "bg-forest-green" : "bg-forest-green/10"
                }`}>
                  <User size={14} className={isStaff ? "text-white" : "text-forest-green"} />
                </div>
                <div className={`max-w-[80%] ${isMe ? "text-right" : ""}`}>
                  <div className={`rounded-lg px-4 py-3 ${isMe ? "bg-forest-green/5" : "bg-off-white"}`}>
                    <p className="text-sm text-charcoal whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <p className="text-[10px] text-medium-gray mt-1">
                    {isStaff ? "Support Team" : `${msg.user?.firstName}`} &middot; {formatDateTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {ticket.status !== "CLOSED" && (
        <Card>
          <form onSubmit={handleReply} className="flex gap-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your message..."
              rows={2}
              required
              className="flex-1 rounded-lg border border-light-gray px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest-green/20 focus:border-forest-green resize-none"
            />
            <Button type="submit" disabled={replyMutation.isPending || !reply.trim()}>
              <Send size={16} />
            </Button>
          </form>
        </Card>
      )}

      {ticket.status === "CLOSED" && (
        <Card>
          <p className="text-sm text-medium-gray text-center py-2">This ticket is closed. Create a new ticket if you need further assistance.</p>
        </Card>
      )}
    </div>
  );
}
```

---

### Task 8: Verify Build

Run `pnpm turbo build` from the repo root. All apps must build successfully.
