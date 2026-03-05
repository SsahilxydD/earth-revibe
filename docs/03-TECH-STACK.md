# Earth Revibe - Tech Stack Document

## Architecture Overview

Turborepo monorepo with three applications sharing common packages:

```
earth-revibe/
├── apps/
│   ├── storefront/        # Next.js 16 - Customer-facing website
│   ├── admin/             # Next.js 16 - Admin dashboard
│   └── api/               # Node.js + Express - REST API server
├── packages/
│   ├── shared/            # Shared Zod schemas, enums, types, utilities
│   ├── db/                # Prisma ORM client + schema + migrations
│   └── tsconfig/          # Shared TypeScript configurations
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Exact Package Versions

### Build System & Tooling

| Package | Version | Purpose |
|---------|---------|---------|
| `turbo` | `2.8.13` | Monorepo build system |
| `pnpm` | `9.x` (latest) | Package manager (workspace support) |
| `typescript` | `5.9.3` | Type system |
| `eslint` | `9.x` | Linting |
| `prettier` | `3.x` | Code formatting |

### Storefront App (`apps/storefront`)

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | `16.1.6` | React framework (App Router) |
| `react` | `19.2.4` | UI library |
| `react-dom` | `19.2.4` | React DOM renderer |
| `tailwindcss` | `4.2.1` | Utility-first CSS framework |
| `zustand` | `5.0.11` | Client-side state management (cart, UI) |
| `@tanstack/react-query` | `5.90.21` | Server state management & caching |
| `react-hook-form` | `7.71.2` | Form handling |
| `@hookform/resolvers` | `5.2.2` | Zod resolver for react-hook-form |
| `framer-motion` | `12.35.0` | Animations & transitions |
| `swiper` | `12.1.2` | Image carousels & sliders |
| `lucide-react` | `0.577.0` | Icon library |
| `date-fns` | `4.1.0` | Date formatting |
| `slugify` | `1.6.6` | URL slug generation |
| `sharp` | `0.34.5` | Image processing (next/image) |
| `recharts` | `3.7.0` | Charts (loyalty dashboard) |

### Admin App (`apps/admin`)

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | `16.1.6` | React framework (App Router) |
| `react` | `19.2.4` | UI library |
| `react-dom` | `19.2.4` | React DOM renderer |
| `tailwindcss` | `4.2.1` | Utility-first CSS |
| `zustand` | `5.0.11` | Client-side state management |
| `@tanstack/react-query` | `5.90.21` | Server state & caching |
| `react-hook-form` | `7.71.2` | Form handling |
| `@hookform/resolvers` | `5.2.2` | Zod resolver |
| `recharts` | `3.7.0` | Dashboard charts & analytics |
| `lucide-react` | `0.577.0` | Icon library |
| `date-fns` | `4.1.0` | Date formatting & manipulation |
| `framer-motion` | `12.35.0` | Animations |
| `@tiptap/react` | `latest` | Rich text editor (blog, product descriptions) |
| `@hello-pangea/dnd` | `latest` | Drag and drop (categories, images) |
| `react-dropzone` | `latest` | File upload drag-and-drop |

### API Server (`apps/api`)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | `5.2.1` | HTTP server framework |
| `cors` | `2.8.6` | Cross-Origin Resource Sharing |
| `helmet` | `8.1.0` | Security headers |
| `express-rate-limit` | `8.2.1` | Rate limiting |
| `jsonwebtoken` | `9.0.3` | JWT token generation & verification |
| `bcryptjs` | `3.0.3` | Password hashing |
| `razorpay` | `2.9.6` | Razorpay payment SDK |
| `cloudinary` | `2.9.0` | Image upload & management |
| `nodemailer` | `8.0.1` | Email sending |
| `multer` | `latest` | File upload middleware |
| `nanoid` | `5.1.6` | Unique ID generation (referral codes) |
| `slugify` | `1.6.6` | URL slug generation |
| `morgan` | `latest` | HTTP request logging |

### Shared Packages (`packages/shared`)

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | `4.3.6` | Schema validation (shared across all apps) |

### Database Package (`packages/db`)

| Package | Version | Purpose |
|---------|---------|---------|
| `prisma` | `7.4.2` | ORM, migrations, schema management |
| `@prisma/client` | `7.4.2` | Auto-generated type-safe database client |

---

## Database

| Technology | Details |
|------------|---------|
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 7.4.2 |
| **Hosting** | Local dev: Docker container / Neon (serverless Postgres) |

---

## External Services & APIs

| Service | Purpose | Details |
|---------|---------|---------|
| **Razorpay** | Payment processing | Magic Checkout, standard checkout, webhooks, refunds |
| **Cloudinary** | Image CDN & management | Upload, transform, optimize product images |
| **SMTP Provider** | Transactional emails | Nodemailer with Brevo/SendGrid/AWS SES |
| **Google Analytics 4** | Analytics & tracking | GA4 with gtag.js + Measurement Protocol |

---

## Development Tools

| Tool | Purpose |
|------|---------|
| **Git** | Version control |
| **Docker** | Local PostgreSQL + containerized development |
| **Postman** | API testing & documentation |
| **VS Code** | IDE |
| **pnpm** | Fast, disk-efficient package manager |

---

## Key Architecture Decisions

### Why Turborepo Monorepo?
- Single source of truth for shared Zod schemas and TypeScript types
- Shared enums between storefront, admin, and API prevent drift
- Turborepo caching speeds up builds significantly
- Unified CI/CD pipeline

### Why Next.js 16 App Router?
- React Server Components for optimal performance
- Built-in SSR/SSG/ISR for SEO
- File-based routing
- Server Actions for form handling
- Image optimization built-in

### Why Express 5 (separate API)?
- Clean separation of concerns from frontend
- Independent scaling of API server
- Better middleware ecosystem for auth, rate limiting, file uploads
- Easier to add WebSocket support later
- Explicit REST API design

### Why Prisma?
- Type-safe database queries matching our TypeScript-first approach
- Auto-generated client from schema
- Declarative migrations
- Works seamlessly in monorepo shared package

### Why Zod 4?
- TypeScript-first validation with native enum support
- Shared schemas between frontend forms and API validation
- 2x faster than Zod 3, smaller bundle with Zod Mini option
- Infer TypeScript types directly from schemas

### Why Zustand over Redux?
- Minimal boilerplate
- Works well with React Server Components
- Simple API for cart state, UI state
- No provider wrapper needed

### Why TanStack Query?
- Server state caching and synchronization
- Automatic background refetching
- Optimistic updates for better UX
- Infinite scroll support
- Devtools for debugging

### Why Tailwind CSS 4?
- Zero-config CSS with auto content detection
- CSS-first configuration (no tailwind.config.js needed)
- Lightning CSS engine for faster builds
- Perfect for component-based design systems

---

## Environment Variables

### Storefront (`apps/storefront/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

### Admin (`apps/admin/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### API (`apps/api/.env`)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/earth_revibe
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
EMAIL_FROM=orders@earthrevibe.com
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your-ga4-secret
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
NODE_ENV=development
PORT=5000
```
