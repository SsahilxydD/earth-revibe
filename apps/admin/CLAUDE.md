# Admin — apps/admin

Next.js 16 App Router. React 19. Tailwind CSS 4. TypeScript.
Admin dashboard for Earth Revibe — product management, orders, customers, blog, support.

## Structure

src/
  app/
    (admin)/       # all admin routes — protected, requires admin auth
    login/         # admin login page — public
  components/
    analytics/     # revenue charts, KPI cards (recharts)
    dashboard/     # dashboard home widgets
    layout/        # sidebar, topbar, breadcrumbs
    products/      # product form, variant editor, image uploader
    ui/            # shared primitives: button, input, table, modal, badge
  hooks/           # custom hooks
  lib/             # api client, helpers
  providers/       # QueryClientProvider, AdminAuthProvider
  stores/          # zustand: ui state, sidebar collapse

## Patterns

- **All admin routes are protected** — check auth in layout, redirect to /login if not authenticated
- **Rich text:** @tiptap/react for product descriptions and blog posts — always use the shared TiptapEditor component
- **Drag and drop:** @hello-pangea/dnd for category ordering and image reordering
- **File upload:** react-dropzone for image uploads — always upload to Cloudinary via API, never direct
- **Charts:** recharts for all data visualizations — ResponsiveContainer always wraps charts
- **Tables:** build with native HTML table + Tailwind — no third-party table library
- **Forms:** react-hook-form + Zod resolver — import schema from @earth-revibe/shared
- **Server Components by default** — "use client" only for interactive components

## Ruflo Swarm

Always use --swarm admin-swarm for work in this directory.

Example:
  ruflo --agent coder --swarm admin-swarm --task "Add low stock alert badge to inventory table"
