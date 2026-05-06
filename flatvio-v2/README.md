# Flatvio Wireframes v2 — Handoff for Claude Code

Editorial fintech reskin of the Flatvio app. Premium feel, big serif numbers,
ink hero cards, status-led color, generous whitespace.

## Files

- `Flatvio Wireframes v2.html` — open this in a browser to view all wireframes
  on a pannable canvas. Drag artboards, click to focus fullscreen.
- `wireframes-v2.css` — design tokens and component styles. **This is the
  source of truth for the new visual system** (color, type, radius, spacing).
- `design-canvas.jsx` — wireframe presentation layer (canvas/section/artboard).
  Not part of the app — only used to view wireframes.
- `v2/primitives2.jsx` — Phone frame, TopBar, TabBar, Ring, Spark, Note, Cap.
  Use as reference for new RN components.
- `v2/v2-tenant.jsx` — All tenant screens (Home, Pay, Success, History,
  Deposit, Proof Upload).
- `v2/v2-landlord.jsx` — All landlord screens + auth (Welcome, Sign-in with
  Google, Complete Profile, Role, OTP-parked, Dashboard, Money, Proof Review,
  Repairs, Empty states, Overdue variant).

## How to view
Open `Flatvio Wireframes v2.html` in any modern browser. No server needed.

## Build order (mirrored in the canvas "Ship list" card)

### Phase 1 — Foundation
- Install `@expo-google-fonts/instrument-serif` + `geist` + `geist-mono`
- Replace `constants/theme.ts` palette with v2 tokens (see `wireframes-v2.css`
  `:root` block)
- Update Tailwind config / NativeWind tokens to match

### Phase 2 — New components
- `SmartHeroCard` — state-driven; renders different content for
  pending / due-soon / overdue / all-clear / move-in-pending
- `InkCard` — black hero card variant with subtle radial-gradient grain
- `CollectionRing` — SVG ring with center label (landlord home)
- `ActionQueueCard` — landlord's "3 actions for you" widget
- `Sparkline` — react-native-svg, used on history + landlord
- `EditorialHeading` — display + italic helper component

### Phase 3 — Re-skin existing
- `Card.tsx` — add `variant="ink"` prop
- `Button.tsx` — pill radius (999), 50px height, mono arrow suffix
- `Input.tsx` — fill background, 14px radius, monospace label
- `StatusPill.tsx` — soft fill colors (good-soft / warn-soft / bad-soft)
- `RentalCard.tsx` — split header / divider / footer pattern

### Phase 4 — Layout changes
- Tenant home: full re-layout to smart-hero pattern
- Landlord home: ring + action queue + bento + property list
- Landlord tab bar: drop to 4 tabs + center FAB
- Add Tenant Rent History as own tab (was buried)

### Phase 5 — Don't change
- Database schema, RLS, Razorpay integration plan, Zustand stores

## Auth changes
- **Google sign-in is primary** (Supabase `signInWithOAuth({provider:'google'})`)
- **Phone OTP is parked** behind `FF_PHONE_AUTH` feature flag — keep code path
  stubbed but UI hidden; the UI shows a disabled "Continue with mobile · SOON"
  button on the sign-in screen
- After Google success: route to `/auth/callback` → if first-time, route to
  `/profile-complete` then `/role`; else home

## Editorial copy — DON'T LOSE THIS
The italic-serif fragments are the brand voice. Keep them in the app:
- "Renting, finally _trustworthy._"
- "Sign in _to Flatvio._"
- "Almost there _— one detail._"
- "How will you _use the app?_"
- "Waiting for _your invite._"
- "Paid _in full._"
