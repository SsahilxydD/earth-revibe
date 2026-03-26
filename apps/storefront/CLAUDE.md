# Storefront — apps/storefront

Next.js 16 App Router. React 19. Tailwind CSS 4. TypeScript.

## Structure

src/
app/
(auth)/ # login, register pages — public routes
(shop)/ # all shopping routes — layout with header/footer
components/
cart/ # cart drawer, cart item, cart summary
checkout/ # checkout form, payment, confirmation
home/ # hero, featured collections, new arrivals
layout/ # header, footer, nav, mobile menu
product/ # product card, product gallery, product filters
ui/ # shared primitives: button, input, badge, modal
hooks/ # custom React hooks
lib/ # api client (fetch wrappers), analytics helpers
providers/ # QueryClientProvider, AuthProvider, etc
stores/ # zustand stores: cart, ui, auth

## Patterns

- **Server Components by default** — only add "use client" when you need interactivity, hooks, or browser APIs
- **Data fetching:** use fetch() in Server Components for SSR/SSG; use TanStack Query (useQuery) in Client Components
- **State:** Zustand for cart + UI state only; TanStack Query for all server state
- **Forms:** react-hook-form + Zod resolver — import schema from @earth-revibe/shared
- **Animations:** framer-motion for page transitions and micro-interactions
- **Images:** always use next/image — never <img> tags
- **Icons:** lucide-react only — no other icon libraries
- **Routing:** file-based App Router — no manual router.push except in event handlers

## Ruflo Swarm

Always use --swarm storefront-swarm for work in this directory.

Example:
ruflo --agent coder --swarm storefront-swarm --task "Add wishlist toggle to ProductCard"
