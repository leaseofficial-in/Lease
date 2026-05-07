# RentyBase Design System

Brand identity, visual foundations, and UI kit for **RentyBase** — a rental management SaaS for India that connects landlords and tenants in one shared workspace.

## What RentyBase does

Rent tracking, **HRA receipt generation** (for Indian income-tax filings), **timestamped move-in photo proof**, security-deposit ledger, repair request tracking, and digital rental agreements. Mobile-first React Native app + a marketing landing page. Free during beta, monetising later via landlord subscriptions.

## Audience

- **Landlords** — 1–5 properties, urban India, 25–45 years, care about documentation and avoiding disputes.
- **Tenants** — urban professionals, 22–35 years, care about HRA tax savings and getting their deposit back.

Both share the same app. **The brand must feel neutral and trustworthy — never landlord-favoured, never aggressive.**

## Source materials

- Codebase: `Lease/` (read-only mount). Expo / React Native + NativeWind, Supabase backend, marketing site under `Lease/landing/`.
- Source-of-truth doc: `Lease/CLAUDE.md`.
- Existing tokens: `Lease/constants/theme.ts`, `Lease/tailwind.config.js`.

## Brand personality

Professional · calm · trustworthy — like a good lawyer or chartered accountant. Quietly modern. Indian context, globally legible.

> **NOT** playful · **NOT** fintech-aggressive · **NOT** startup-bubbly.

---

## Index

| File | What's in it |
|---|---|
| `README.md` | This file — brand brief, content fundamentals, visual foundations, iconography. |
| `colors_and_type.css` | All design tokens as CSS custom properties — colors, type scale, semantic vars. |
| `SKILL.md` | Agent skill manifest. Read first when invoking this design system as a skill. |
| `assets/` | Logo lockups (SVG), favicon, brand marks. |
| `fonts/` | Webfont references (DM Sans + Instrument Serif + JetBrains Mono are loaded from Google Fonts). |
| `preview/` | Per-token preview cards rendered in the Design System tab. |
| `ui_kits/app/` | High-fidelity recreation of the React Native app — dashboards, payment, proof flow. |
| `ui_kits/landing/` | Marketing landing page recreation. |

---

## Content fundamentals — voice & tone

RentyBase writes like a **calm, competent professional** who respects your time and your money. We are explicit about what is happening, why, and what happens next. We never hype, never use exclamation points except in genuine confirmations, and never use emoji in product UI.

### Voice rules

- **Sentence case everywhere** except `RentyBase` (always one word, no space, capital R + B). Section labels in micro-caps + tracked are an exception (e.g. `MOVE-IN PROOF`).
- **Second person, never first.** "Your rent is due in 3 days" — not "We've noticed your rent is due."
- **Concrete numbers and dates** beat hedged language. "Due **Nov 5**" not "Due soon."
- **Indian English.** ₹ and "lakh"/"crore" where natural. "Move-in", "PG/Hostel", "HRA receipt", "leave and license", "UTR number", "PAN".
- **No emoji** in product UI. Status is communicated by colour + label + icon, not 🎉 or ✅.
- **No exclamation points** except in success confirmations after a user action ("Receipt downloaded.").
- **Numerals for amounts**, currency symbol with no space: `₹18,500`, `₹1.2L`. Use `Rs` only when the rupee glyph isn't reliable in the surface.

### Voice examples — wrong vs right

| Surface | ❌ Wrong | ✅ Right |
|---|---|---|
| Error | "Oops! Something went wrong 😬" | "We couldn't reach the server. Try again in a moment." |
| Empty state | "No rentals yet — let's get you started! 🚀" | "No rentals yet. Add your first property to invite a tenant." |
| Success | "Yay! Payment successful 🎉" | "Paid. UTR `4581 2210 9914` saved to your records." |
| CTA | "Get Started Now ✨" | "Add a property" / "Pay rent" / "Generate receipt" |
| Overdue nudge | "Hey! You're 3 days late on rent 😅" | "Rent is 3 days overdue. Pay now to keep your record clean." |
| Section headline | "Awesome features for awesome landlords 💪" | "Everything a small landlord needs, in one place." |

### Casing

- UI labels: **Sentence case** ("Add property", "Move-in proof").
- Eyebrow / micro-cap labels: **UPPERCASE** + 0.08em tracking ("MOVE-IN PROOF", "RENT DUE").
- Headlines: **Sentence case**. Reserve title case for legal documents only (e.g. "Leave and License Agreement").
- Buttons: **Sentence case**, verb-led ("Add property", "Pay rent", "Generate HRA receipt").

---

## Visual foundations

### Colour philosophy

The product handles money and legal documents shared between two people who don't trust each other yet. Colour must feel **calm, ledger-like, and warm** — not loud, not cold.

We replaced the previous indigo `#5046E4` with **Trust Teal `#0F4C5C`** — a deep slate-teal that reads as professional/legal (close to dark-green ledger ink) while still being clearly modern. It pairs with a warm off-white canvas (`#F6F4EE`) that nods to paper records without being skeuomorphic.

- **Primary action: `#0F4C5C` (Trust Teal)** — buttons, links, focus rings.
- **Ink (text): `#0E1413`** — near-black with a faint teal undertone, harmonises with the action.
- **Canvas: `#F6F4EE`** — warm off-white, the document feel. Used for app and landing backgrounds.
- **Surface: `#FFFFFF`** — cards, inputs, modals. Always sits *on top of* canvas.
- **Accent: `#C97A3A` (Seal Ochre)** — used sparingly for premium moments, success seals, and the brand gradient. Indian-context-warm without being saffron-political.
- **Semantic:** `#1F7A55` success · `#B8740F` warning · `#B33A2E` danger · `#0F4C5C` info (= action).

All exact hex values + soft-tints + WCAG contrast notes are in `colors_and_type.css`.

### Type

- **Display / editorial: Instrument Serif** — already in the codebase, classier than Fraunces, reads more lawyerly. Used for hero H1, big numbers, and quotes.
- **UI: DM Sans** — kept. Neutral, generous proportions, reads well at small sizes on Indian Android devices.
- **Mono: JetBrains Mono** — for amounts, UTR/PAN numbers, codes, tokens. Tabular figures via `font-feature-settings: "tnum"`.

Display H1 uses italic for one or two words to break the seriousness slightly — see hero copy "Rent that **trusts itself**." This is the only place italic appears.

### Backgrounds

- **No gradients on backgrounds.** Solid canvas (`#F6F4EE`) or solid surface (`#FFFFFF`) only.
- **One brand gradient,** used only for hero panels and the "premium" / paid moment: `linear-gradient(135deg, #0F4C5C 0%, #163A47 60%, #0E1413 100%)` with a faint Seal-Ochre glow in the upper right (`radial-gradient(circle at 80% 10%, rgba(201,122,58,0.18), transparent 55%)`).
- **No hand-drawn illustrations**, no patterns, no textures. The product is a record of facts; ornament reads as untrustworthy.
- **Photography** is allowed only on the marketing site, and only as full-bleed warm-toned interiors (Indian apartments), never stock-office or stock-money imagery.

### Animation

- **Fades + small Y translate.** 28px → 0, 600ms, `cubic-bezier(.22,1,.36,1)` — same as the existing landing.
- **No bounces, no spring overshoots, no parallax.** Calm.
- **Hover lift:** `translateY(-1px)` + shadow grows. Never scale > 1.0.
- **Press:** `scale(0.97)` over 120ms. Used on every primary tap target.
- **Status pulses:** the green "live" dot pulses 2.2s ease-in-out — only on live status indicators. Never on CTAs.

### Hover & press states

- **Primary buttons:** background goes `#0F4C5C → #0A3A47` (10% darker), shadow grows from `0 1px 2px rgba(15,76,92,.15)` to `0 8px 24px rgba(15,76,92,.28)`, lift 1px.
- **Secondary buttons:** background goes `#FFFFFF → #F0EFE9` (canvas-tinted), border darkens one notch.
- **Links:** underline on hover, never colour change.
- **Press:** all interactive elements `scale(0.97)` for 120ms.

### Borders

- **Always 1px, always solid, never dashed in product UI** (dashed reserved for "drop a photo here" empty zones).
- Default border: `#E6E2D7` (canvas-tinted, warmer than gray) on canvas; `#EBE7DB` on white surfaces.
- Focus ring: `0 0 0 3px rgba(15,76,92,0.18)` + 1px solid `#0F4C5C`.

### Shadows

- **Card (resting):** `0 1px 2px rgba(20,18,12,0.04), 0 2px 8px rgba(20,18,12,0.05)`. Soft, warm-tinted (not blue-black).
- **Card (hover):** `0 4px 12px rgba(20,18,12,0.06), 0 12px 32px rgba(20,18,12,0.08)`.
- **Modal:** `0 -4px 16px rgba(20,18,12,0.04), 0 24px 64px rgba(20,18,12,0.18)`.
- **Inset / inputs (focused):** `inset 0 0 0 1px #0F4C5C`.

We **do not** use coloured shadows except a single Trust-Teal-tinted shadow under primary buttons on hover.

### Layout & spacing

- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80. No half-pixels, no in-between values.
- **Container:** 1100px max on landing, 24px gutter. App content: 16px gutter mobile, 20px gutter on web.
- **Card padding:** 18–20px. Section vertical padding on landing: 88px.
- **No fixed footers / floating CTAs** in the app except the bottom tab bar. Trust = predictable.

### Corner radii

- **Inputs / pills / buttons:** 999px (full pill) for primary-touch targets. Pills feel approachable but the warm-on-warm palette keeps them serious.
- **Cards:** 18–22px (`Radius.lg`–`Radius.xl`). Generous but not bubbly.
- **Logo tile:** 14px (sharper than cards — feels like a stamp/seal).
- **Bottom sheets:** 24px top corners.

### Cards

White surface · 1px `#EBE7DB` border · 18–22px radius · resting shadow above. **No coloured left-borders.** Status is shown by a pill in the top-right, never by tinting the card itself.

### Transparency & blur

- Sticky nav: `rgba(255,255,255,0.96)` + `backdrop-filter: blur(12px)`.
- Modal scrim: `rgba(14,20,19,0.45)` — warm black, not blue.
- No frosted-glass effects elsewhere — they read as "consumer app", not "ledger".

### Imagery tone

- **Warm, neutral light**, never cool/blue. Saturation slightly under 1.0.
- **No b&w**, no heavy grain, no duotone.
- People photography (testimonials only) shot at eye level, no hero poses.

---

## Iconography

RentyBase uses **Lucide** (https://lucide.dev) at **1.75px stroke**, **20px** default size, **24px** in nav/empty states, **16px** in dense rows. Lucide's stroke weight is calmer than Heroicons-outline, more legible than Feather, and the geometry is rounder which suits the warm palette.

- **Stroke-only by default.** No filled icons in product UI except the active tab indicator.
- **Single colour per icon**, inheriting the surrounding text colour. Coloured icons appear only inside semantic-tint pills (e.g. green check inside `success-soft` pill).
- **Round line caps, round joins.** This is Lucide's default.
- **Corner radius on inner shapes** (e.g. building icons) follows the icon's own geometry — we don't override.
- **Never emoji.** Never unicode dingbats (✓ ✗ etc) — use Lucide `Check` / `X` SVG instead.
- **Brand mark is never used as a UI icon** — it's reserved for app launcher, splash, marketing logo lockup, and the favicon.

The only **filled** icons in the system: solid `Shield` (in the move-in-proof seal stamp) and solid `BadgeCheck` (in the verified-receipt seal). Both render in Seal Ochre `#C97A3A`.

Iconography assets that ship with this design system:

- `assets/logo-mark.svg` — square logo tile, 512×512.
- `assets/logo-mark-mono.svg` — single-colour version.
- `assets/logo-lockup-horizontal.svg` — full lockup, icon + wordmark.
- `assets/logo-lockup-stacked.svg` — stacked variant for narrow spaces.
- `assets/wordmark.svg` — wordmark only.
- `assets/favicon.svg` — 16/32px optimized version.
- `assets/seal-stamp.svg` — Seal Ochre verified-record stamp used on receipts.

For UI icons we **link Lucide from CDN** (`unpkg.com/lucide-static@latest/icons/<name>.svg`) inside the UI kit — we don't bundle the whole set. If a particular icon is missing, draw a placeholder with the same stroke weight and flag it.

---

## Logo system

### Three explored directions

Renders live in `preview/logo-directions.html`.

1. **Direction A — "Keystone Monogram" (RECOMMENDED)** — A serifed `R` whose right leg drops into a key-tooth notch. Reads as both "R" and a key turning a lock. Sits on a 14px-radius warm-canvas tile. Distinctive at 16px (the notch reads as a thicker stem); confident at 512px.
2. **Direction B — "Receipt Seal"** — Concentric rounded square with a serifed `R` and a small stamp dot. Strong "official document" association but loses detail under 24px.
3. **Direction C — "Doorframe"** — Abstract `R` built from two architectural lines forming a doorway with a key dot. Very abstract — strong but loses "RentyBase" specificity.

**We recommend Direction A** for these reasons: (i) it reads as a serifed `R` first, a key second — so it survives at 16px as just a recognisable letter; (ii) the warm-canvas tile distances us from the indigo-square pattern of fintech competitors; (iii) it pairs naturally with Instrument Serif in the wordmark.

### Wordmark

`RentyBase` set in **Instrument Serif Regular**, optical size = 28pt, **letter-spacing −0.02em**, weight 400 (Instrument Serif is a single-weight family). The single capital `B` mid-word stays — it's a deliberate part of the mark, never lowercased.

A faint **trailing dot** (`.`) in italic Ochre is optional, used only on signature surfaces (auth screen, footer). It nods to the "record / receipt / final" feeling without being literal.

### Lockup spacing

The icon tile is the unit (`u`).

- **Horizontal lockup:** icon + 0.5u gap + wordmark. Wordmark cap-height = icon height × 0.66.
- **Stacked:** icon centred above wordmark with 0.4u gap.
- **Clear space:** 0.5u on every side. No copy or other marks may enter this zone.
- **Minimum width:** horizontal lockup → 96px wide; stacked → 64px wide; mark alone → 16px.

---

## Voice & tone — additional rules

- **Don't apologise generically.** "Sorry about that" is empty. Either say what went wrong specifically, or don't apologise.
- **Confirm in the user's words.** After a user adds a property called "Bandra 2BHK", the success says "Bandra 2BHK added." Not "Property added."
- **Money is always exact.** Never round. `₹18,500` not `₹18.5K` (compact form is fine for summary cards but never receipts/agreements).
- **Dates always include the year on legal surfaces.** "5 Nov 2025" on receipts. "Nov 5" is fine in the dashboard "due in 3 days" context.
- **Indian usage.** "Apartment" or "Flat" — never "Unit". "PG/Hostel" — never "Co-living". "Monthly rent" — never "Lease payment".

---

## Brand antipatterns — never do these

1. **Indigo / purple gradients** (we deliberately moved off `#5046E4`). Reads as fintech-bro.
2. **Emoji in product UI** — including ✅ ✨ 🎉. Reads as toy-app, undermines the legal-document promise.
3. **Coloured cards with left-border accent stripes.** Status belongs in a pill. Tinting the whole card creates visual hierarchy that the data doesn't have.
4. **Round photo frames or hand-drawn illustrations.** We are records, not vibes.
5. **Hype copy.** "World-class", "revolutionary", "AI-powered", "world's first" — the audience is paying customers and tax authorities, not an investor pitch. Show the receipt, don't shout.
