# Future Implementations

Potential enhancements beyond the current 11-phase build.

---

## Phase 12: Deployment & DevOps

- Dockerfiles for API, Admin, and Storefront apps
- `docker-compose.yml` with PostgreSQL, Redis, and all three services
- CI/CD pipeline (GitHub Actions) — lint, build, test, deploy
- Environment-specific configs (staging, production)
- Health check endpoints and monitoring setup
- Nginx reverse proxy configuration
- SSL/TLS certificate automation

## Phase 13: Email & Notifications

- Transactional emails via Nodemailer (SMTP already configured in env):
  - Order confirmation and status updates
  - Password reset link delivery (currently logs to console)
  - Welcome email on registration
  - Shipping notifications
- In-app notification system (Notification model already exists in DB):
  - Real-time notifications via SSE or WebSocket
  - Notification preferences page in storefront account
  - Admin notification center for new orders, low stock alerts, support tickets
- Email templates with brand styling

## Phase 14: Image Upload

- Cloudinary integration for product and blog images (SDK already installed):
  - Product image upload in admin product form
  - Blog featured image upload in admin blog editor
  - Category image upload
  - User avatar upload in profile settings
- Multer middleware for multipart form handling (already installed)
- Image optimization and responsive srcset generation
- Drag-and-drop upload UI with preview

## Phase 15: Admin Settings & Config

- Admin settings page for StoreSettings model:
  - Store name, logo, contact info
  - Social media links
  - GST rate configuration
  - Free shipping threshold
  - Return window days
- Shipping zones management (ShippingZone model exists):
  - Zone CRUD with state selection
  - Rate configuration per zone
  - Delivery time estimates
- Discount code management improvements:
  - Bulk create/edit
  - Usage analytics
  - Category/product targeting UI

## Phase 16: Polish & UX

- Loading states and skeleton screens across all pages
- Error boundaries with fallback UI
- Responsive design audit and fixes for mobile
- Accessibility audit (ARIA labels, keyboard navigation, screen reader support)
- Toast notification improvements
- Empty state illustrations
- Infinite scroll for product listings
- Image lazy loading with blur placeholders
- Page transition animations
- Dark mode support for admin dashboard
