# Admin Mobile — apps/admin-mobile

Expo SDK 53 + Expo Router v4 + React Native 0.78. Real native Android (and later iOS) admin app — NOT a WebView wrapper. New Architecture enabled.

## Structure

app/ # Expo Router file-based routes (mirrors Next.js App Router)
(auth)/ # login, otp — public
(admin)/ # all protected routes (orders, products, customers)
\_layout.tsx # root provider stack (QueryClient, GestureHandler, SafeArea)
src/
components/ui/ # shared primitives: Button, Input, Card, Badge, Skeleton
components/orders/ # OrderCard, OrderStatusPill, StatusUpdateSheet, etc.
hooks/ # use-auth, use-orders, use-push (TanStack Query)
lib/ # api-client (Bearer + SecureStore), push, secure-store
providers/ # AuthProvider
stores/ # zustand: ui state
assets/ # icons, splash images

## Patterns

- **NativeWind v4** for styling — Tailwind class strings on RN primitives. `tailwind.config.js` mirrors web admin design tokens.
- **Expo Router v4** for navigation — file-based, mirrors `apps/admin/src/app/(admin)/...`
- **State:** Zustand for local/UI state; TanStack Query for all server state — same patterns as web admin.
- **Forms:** react-hook-form + Zod resolver — schemas imported from `@earth-revibe/shared` (no duplication).
- **Auth:** Bearer tokens in body via `X-Client: mobile` header. Tokens stored in `expo-secure-store`. Refresh on 401 in api-client.
- **Push:** `expo-notifications`. Token registered via `POST /auth/devices` on login, removed on logout.
- **Lists:** `@shopify/flash-list` (not `FlatList`) for any list with pagination/infinite scroll.
- **Bottom sheets / action sheets:** `react-native-bottom-sheet` (added in Phase 2).
- **Icons:** `lucide-react-native` only.

## Commands

```bash
pnpm --filter @earth-revibe/admin-mobile dev # start Metro
pnpm --filter @earth-revibe/admin-mobile android # build & run on connected device/emulator
pnpm --filter @earth-revibe/admin-mobile build:eas # EAS preview build (.apk)
```

## Monorepo gotchas

- `metro.config.js` watches the workspace root and resolves modules from both this app's `node_modules` and the root's. Don't simplify — pnpm symlinks need both paths.
- `babel.config.js` uses `babel-preset-expo` with `jsxImportSource: 'nativewind'` plus the `nativewind/babel` preset. Order matters.
- `@earth-revibe/shared` is a pre-built package (`tsc` to `dist/`). Run `pnpm --filter @earth-revibe/shared build` before first launch.

## Deferred / out of scope (v1)

- iOS build — needs Apple Developer account; revisit later.
- Image upload via camera — defer to v2.
- Blog editing (TipTap on RN is a rabbit hole) — never on mobile.
- Analytics charts — defer.
