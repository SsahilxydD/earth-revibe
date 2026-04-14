# Earth Revibe — Travel Circle Application

A page-by-page mobile application flow for the Earth Revibe travel circle.
14 screens, 1:1 with `trip.pen`.

## Stack

- **Next.js 15** (App Router, React 19)
- **Tailwind CSS v4** (tokens in `app/globals.css` `@theme` block)
- **Framer Motion 11** (page transitions + staggered reveals)
- **Zustand** (single-store flow state)
- **TypeScript**, strict mode

## Run locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

> React 19 + Next 15 is used so React Compiler-ready patterns don't fight the
> current canary. If `npm install` is finicky, pin React to `18.3.1` and use
> Next `14.2.x` — the rest of the code is version-agnostic.

## Architecture

```
app/
  layout.tsx       — root HTML, Fraunces + Inter font loaders, metadata
  page.tsx         — single-page flow controller, AnimatePresence <Screen />
  globals.css      — @theme tokens (paper/ink/clay/wa/etc) + font utility classes

lib/
  types.ts         — Step, FormData, YesNo enums
  flow.ts          — ORDER array + nextStep/prevStep
  store.ts         — Zustand flow store (single source of truth)
  motion.ts        — shared variants (pageVariants, stageContainer, stageItem)
  auth.ts          — sendWhatsAppCode / verifyWhatsAppCode  (STUBS — see below)
  submit.ts        — submitApplication                      (STUB  — see below)

components/
  shell/           — TopBar, Logo, Eyebrow, ProgressBar, BottomNav, ScreenShell
  ui/              — ChoiceCard, YesNoCard, SplitCard, PillChoice,
                     CheckboxCard, UnderlineField
  screens/         — 14 screens: PhoneGate → OtpVerify → Welcome →
                     Name → Age → City → Instagram → TravelerType →
                     WhyJoin → PastTravel → TripPrefs → MeetBefore →
                     Curated → Submitted
```

Every question screen is composed the same way:

```tsx
<ScreenShell topRight={<StepPill label="04 / 10" />} bottom={<BottomNav …/>}>
  <Eyebrow>Q · 04</Eyebrow>
  <Question />
  <Helper />
  <InputArea />
</ScreenShell>
```

The `TopBar` and `BottomNav` persist across route changes — only the content
inside `<ScreenShell>` is swapped by `AnimatePresence` on `page.tsx`. This
matches the Framer handoff panel on the canvas: page transition lives at the
screen level, staggered child reveal lives inside each stage.

## Design tokens

Straight from `trip.pen`:

| Token              | Hex       |
| ------------------ | --------- |
| `--color-paper`    | `#F2EDE3` |
| `--color-surface`  | `#FFFFFF` |
| `--color-ink`      | `#1A1714` |
| `--color-ink-soft` | `#4A4239` |
| `--color-muted`    | `#6E665B` |
| `--color-dim`      | `#8C8273` |
| `--color-hairline` | `#D9CFBC` |
| `--color-clay`     | `#B85C38` |
| `--color-wa`       | `#1F8754` |
| `--color-sage`     | `#5C7C5F` |

Typography: **Fraunces** (display, weights 300/400/500) + **Inter** (sans,
400–700), both loaded via `next/font`.

## Integration points (everything else is just UI)

There are exactly three places where mock logic lives. Replace them to wire to
your existing `earthrevibe.com` auth + application backend — no other file needs
to change.

### 1. `lib/auth.ts` → `sendWhatsAppCode(phone)`

Currently a `setTimeout`. Swap for:

```ts
await fetch('/api/auth/whatsapp/send', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ phone: `+91${phone}` }),
});
```

Your backend (Vercel serverless or the existing Next.js app at
`earthrevibe.com`) calls the Meta WhatsApp Cloud API server-side.

### 2. `lib/auth.ts` → `verifyWhatsAppCode(phone, code)`

Currently accepts any 6-digit number. Swap for:

```ts
const r = await fetch("/api/auth/whatsapp/verify", { … });
return (await r.json()).ok;
```

Return `true` only on a verified code. The caller already sets
`data.phoneVerified = true` + advances the flow on success.

### 3. `lib/submit.ts` → `submitApplication(data)`

POST the whole `FormData` to your application-intake endpoint. The returned
`id` is shown on the final screen (`ER-2026-####`).

### If the form will live on a different origin than `earthrevibe.com`

- Deploy at `travel.earthrevibe.com` (Vercel subdomain)
- On the existing auth, set the session cookie with `domain=.earthrevibe.com`
- Enable CORS on `/api/auth/*` for the trip-form origin

See `memory/project_trip_form.md` for the full handoff brief.

## Animation specs (mirrored to the canvas handoff panel)

- **Page transition:** `x: 24 → 0` / `x: -24 → 0`, duration 0.42s,
  ease `[0.22, 1, 0.36, 1]` (see `lib/motion.ts` → `pageVariants`)
- **Staggered reveal:** `y: 12 → 0` + `opacity 0 → 1`, stagger 0.06s
  (see `stageContainer` / `stageItem`)
- **Progress bar:** each segment's background animates via Framer Motion
  (`ProgressBar.tsx`) — no layout thrash
- **Tap feedback:** every interactive surface has `whileTap: { scale: 0.985 }`
  via `tapFeedback` (`lib/motion.ts`)
- **CTA hover:** arrow glyph translates `x: +2` on `group-hover`

## Deployment

Zero-config on Vercel. The only envs you'll add during integration are the
WhatsApp Cloud API credentials (server-side only).

```bash
git init && git add -A && git commit -m "initial"
vercel --prod
```
