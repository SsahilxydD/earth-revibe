# API — apps/api

Express 5. TypeScript. Prisma 7. PostgreSQL 16.
REST API at /api/v1/. All endpoints require JWT auth except /auth/\* and public product/category reads.

## Structure

src/
config/ # env config, db config, cloudinary config
controllers/ # request handlers — thin, delegate to services
middleware/ # auth, error handler, rate limiter, validation
routes/ # express routers — one file per resource
services/ # business logic — all DB access goes here
types/ # express Request augmentation, shared types
utils/ # helpers: jwt, email, slugify, pagination
app.ts # express app setup (no listen here)
index.ts # server listen entry point

## Patterns

- **Controllers are thin** — validate input (Zod), call service, return response. No business logic in controllers.
- **Services own all DB access** — all Prisma queries go in services/, never in controllers or routes
- **Validation:** use Zod schemas imported from @earth-revibe/shared in middleware before controller runs
- **Error format:** always { success: false, error: { code: string, message: string } } — use the central error handler
- **Auth:** authenticateToken middleware extracts req.user from JWT — all protected routes use this middleware
- **Pagination:** all list endpoints accept page + limit query params, return { data, pagination: { page, limit, total, totalPages } }
- **File uploads:** multer for multipart, then immediately upload to Cloudinary in the service — never store files locally
- **Razorpay webhooks:** always verify X-Razorpay-Signature header before processing

## Existing Routes

auth, product, category, cart, checkout, order, address, wishlist, review, search,
blog, support, discount, loyalty, referral, shipping, upload, analytics,
admin-product, admin-order, admin-customer, admin-blog, admin-discount,
admin-inventory, admin-support, admin-notification

## Ruflo Swarm

Always use --swarm api-swarm for work in this directory.

Example:
ruflo --agent coder --swarm api-swarm --task "Add endpoint to bulk update inventory stock levels"
ruflo --agent security-architect --swarm api-swarm --task "Audit auth middleware for token validation gaps"
