# Flatvio — Project Handoff Document

> This file is the single source of truth for any AI assistant or developer continuing work on this project. Read it fully before making changes.

---

## What This App Is

**Flatvio** is a React Native / Expo mobile app (also runs on web) for managing rental properties in India. It connects **landlords** and **tenants** in a shared rental workflow.

**Core features:**
- Phone OTP login (Supabase Auth, India +91 numbers)
- Role selection after first login: Landlord or Tenant
- Landlord: create rentals, invite tenants via link, view rent payments, review move-in/move-out photo proof, manage deposit deductions, track repair requests
- Tenant: join rental via invite link, pay rent (Razorpay), upload room photos for move-in proof, raise repair requests, view agreement, view rent history
- Push notifications (Expo) for rent reminders
- WhatsApp notifications via Twilio (Edge Function)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54, React Native 0.81, Expo Router v6 |
| Language | TypeScript (strict mode) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Styling | NativeWind v4 + TailwindCSS v3 |
| State | Zustand (auth, rental, UI stores) |
| Data fetching | TanStack React Query v5 |
| Payments | Razorpay (Edge Function + simulated SDK) |
| Notifications | Expo Notifications + Twilio WhatsApp |

---

## Environment Variables

File: `.env` (already created, **excluded from git via `.gitignore`**)

```
EXPO_PUBLIC_SUPABASE_URL=https://tuojgwrzfecyeiccdrlj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_jKQSCW7n3hwESw6YHKrZWQ_r3fk62WF
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

Template without secrets is in `.env.example`.

Edge Function secrets (set via `supabase secrets set`, NOT in .env):
- `RAZORPAY_KEY_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

---

## Project Structure

```
c:\GitHub\Lease\
├── app/
│   ├── _layout.tsx              # Root layout — AuthGate + QueryClient + Stack
│   ├── (auth)/
│   │   ├── _layout.tsx          # Auth group layout
│   │   ├── index.tsx            # Welcome / landing screen
│   │   ├── login.tsx            # Phone OTP login (2-step: phone → 6-digit OTP)
│   │   └── role-select.tsx      # Pick landlord or tenant after first login
│   ├── (landlord)/
│   │   ├── _layout.tsx          # Landlord tab layout
│   │   ├── index.tsx            # Landlord dashboard (rental list + stats)
│   │   ├── create-rental.tsx    # Create property + rental form
│   │   ├── payments.tsx         # Payment history across all rentals
│   │   ├── profile.tsx          # Landlord profile edit
│   │   ├── property/[id].tsx    # Single rental detail + invite link
│   │   └── proof/[rentalId].tsx # Review move-in/move-out proof photos
│   ├── (tenant)/
│   │   ├── _layout.tsx          # Tenant tab layout
│   │   ├── index.tsx            # Tenant dashboard (property + current rent)
│   │   ├── join.tsx             # Join rental by pasting invite token
│   │   ├── pay-rent.tsx         # Pay current month rent via Razorpay
│   │   ├── rent-history.tsx     # All past rent payments
│   │   ├── deposit.tsx          # View deposit transactions
│   │   ├── agreement.tsx        # View/sign rental agreement
│   │   ├── repairs.tsx          # List + create repair requests
│   │   ├── profile.tsx          # Tenant profile edit
│   │   └── proof/upload.tsx     # Upload room photos per room label
│   └── join/[token].tsx         # Deep link handler for invite tokens
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx           # Animated button (primary/secondary/ghost/danger, sm/md/lg)
│   │   ├── Input.tsx            # Text input with label, error, left/right icons
│   │   ├── Card.tsx             # White rounded card container
│   │   ├── Badge.tsx            # Small status badge
│   │   ├── StatusPill.tsx       # Pill for rental/payment/repair status
│   │   ├── Avatar.tsx           # Circular avatar with initials fallback
│   │   ├── BottomSheet.tsx      # Modal bottom sheet
│   │   ├── EmptyState.tsx       # Empty list placeholder with optional action
│   │   ├── LoadingScreen.tsx    # Full-screen centered spinner
│   │   └── SkeletonLoader.tsx   # Skeleton cards for loading states
│   ├── rental/
│   │   ├── RentalCard.tsx       # Rental summary card (landlord + tenant variants)
│   │   ├── DepositCard.tsx      # Deposit balance + transaction list
│   │   ├── RentStatusBadge.tsx  # Shows paid/pending/overdue for a payment
│   │   └── ActivityFeed.tsx     # Timeline of rental events
│   ├── proof/
│   │   ├── PhotoGrid.tsx        # Grid of uploaded proof photos
│   │   ├── PhotoTile.tsx        # Single photo tile with annotation overlay
│   │   ├── RoomTabs.tsx         # Horizontal tab bar for room labels
│   │   └── AnnotationModal.tsx  # Modal for adding text annotation to a photo
│   └── payment/
│       └── PaymentMethodSelector.tsx  # UPI / Card / Netbanking selector
│
├── stores/
│   ├── authStore.ts     # session, profile, initialize(), fetchProfile(), setRole(), signOut()
│   ├── rentalStore.ts   # activeRental, landlordRentals, updateRentalInList()
│   └── uiStore.ts       # toasts (auto-dismiss 3.5s), bottom sheet open/close
│
├── lib/
│   ├── supabase.ts      # Supabase client with SecureStore+AsyncStorage adapter
│   ├── formatters.ts    # formatCurrency (INR), formatDate, normalizePhone, monthKey, status labels
│   ├── storage.ts       # pickPhoto, takePhoto, uploadProofPhoto, uploadAvatar, uploadRepairPhoto
│   ├── notifications.ts # registerForPushNotifications, scheduleRentReminder
│   └── razorpay.ts      # createPaymentOrder (Edge Fn call), verifyAndRecordPayment
│
├── constants/
│   ├── config.ts        # App-wide constants (Supabase URL/key from env, app scheme, limits)
│   └── theme.ts         # Color palette: primary, action, success, warning, danger, border, muted
│
├── types/
│   └── index.ts         # All TypeScript interfaces: Profile, Property, Rental, RentPayment,
│                        #   DepositTransaction, Proof, ProofPhoto, RepairRequest, AppNotification,
│                        #   form types, route param types
│
├── supabase/
│   ├── migrations/
│   │   └── 001_schema.sql   # Full DB schema — paste into Supabase SQL Editor to set up
│   └── functions/
│       ├── send-whatsapp/index.ts         # Twilio WhatsApp notification
│       ├── create-payment-order/index.ts  # Creates Razorpay order
│       └── generate-hra-receipt/index.ts  # Generates HRA receipt PDF
│
├── global.css           # @tailwind base/components/utilities — imported in _layout.tsx
├── tailwind.config.js   # NativeWind preset, darkMode: 'class', custom colors
├── metro.config.js      # withNativeWind(config, { input: './global.css' })
├── babel.config.js      # jsxImportSource: "nativewind" + nativewind/babel preset
├── postcss.config.js    # tailwindcss + autoprefixer (needed for web CSS compilation)
├── app.json             # Expo config — app name "Flatvio", scheme "flatvio"
├── tsconfig.json        # strict: true, excludes supabase/functions (Deno)
└── .env                 # GITIGNORED — holds real Supabase + Razorpay keys
```

---

## Database Schema (Supabase)

**Status: Schema has been applied.** Run `001_schema.sql` in Supabase SQL Editor if starting fresh.

### Tables
| Table | Description |
|---|---|
| `profiles` | One per auth user. Has `role` (landlord/tenant), phone, full_name, avatar_url, pan_number, push_token |
| `properties` | Belongs to a landlord. Address + property_type |
| `rentals` | Links property + landlord + tenant. Has invite_token, status, monthly_rent, security_deposit, rent_due_day |
| `rent_payments` | One per rental per month. Has status (paid/pending/overdue/partial), razorpay IDs |
| `deposit_transactions` | Received/deduction/refund entries for security deposit |
| `proofs` | move_in or move_out proof submission (one per rental per type) |
| `proof_photos` | Individual photos for a proof, keyed by room_label |
| `repair_requests` | Raised by tenant, updated by landlord |
| `notifications` | In-app notifications per user |

### Key Triggers
- `on_auth_user_created` → auto-inserts into `profiles` on new Supabase auth signup
- `rental_activated` → auto-creates first `rent_payment` record when rental status → active
- `set_updated_at` → auto-updates `updated_at` on rentals, proofs, repair_requests, profiles

### Storage Buckets
- `proof-photos` — public
- `repair-photos` — public
- `avatars` — public
- `agreements` — private

---

## Auth Flow

```
App opens
  └── RootLayout: calls initialize() → supabase.auth.getSession()
        ├── No session → AuthGate redirects to /(auth) → Welcome screen
        │     └── "Get Started" → /login → Phone number → OTP → verified
        │           └── First login (no role) → /role-select → pick landlord/tenant
        │                 └── role saved to profiles → AuthGate redirects to dashboard
        └── Has session + role
              ├── role = 'landlord' → /(landlord) dashboard
              └── role = 'tenant'   → /(tenant) dashboard
```

**Phone auth uses Supabase's built-in OTP.** For testing without Twilio:
- Supabase Dashboard → Authentication → Providers → Phone → On → SMS Provider: None (Testing only)
- Add test phone number + fixed OTP code

---

## Styling System (NativeWind v4)

**Custom colors** (defined in `tailwind.config.js` and `constants/theme.ts`):
| Token | Hex | Usage |
|---|---|---|
| `primary` | `#0A0A0A` | Main text, dark backgrounds |
| `action` | `#1A56FF` | Buttons, links, active states |
| `success` | `#00C896` | Paid status, positive indicators |
| `warning` | `#F59E0B` | Overdue, caution |
| `danger` | `#EF4444` | Errors, destructive actions |
| `border` | `#EBEBEB` | Card borders, dividers |
| `muted` | `#8A8A8A` | Secondary text, placeholders |

---

## Known Issues & Current Status

### ✅ Fixed in this session
1. **App stuck on "Starting Flatvio…"** — `initialize()` was inside `AuthGate` which only rendered after `isInitialized` was true (chicken-and-egg). Fixed by moving `initialize()` to `RootLayout`.
2. **TypeScript errors** — `paymentId` non-null assertion in `pay-rent.tsx:83`, `useState<string>` type in `proof/upload.tsx:35`, `[...Config.defaultRooms]` spread to satisfy `string[]`.
3. **Supabase schema ordering error** — `profiles` RLS policies referenced `rentals` before it existed. Fixed by creating all tables first, then all policies.
4. **NativeWind / TailwindCSS version mismatch** — `tailwindcss` was v4 but NativeWind v4 requires v3. Downgraded to `tailwindcss@3.4.19`.
5. **Metro config ESM error on Windows** — `nativewind/metro` couldn't load due to Node.js ESM URL scheme issue on Windows paths. Was caused by tailwindcss v4 (ESM-only). Resolved by the tailwindcss v3 downgrade.
6. **`.gitignore` missing `.env`** — added `.env` to prevent secrets being pushed to GitHub.

### ⚠️ In Progress / Not Yet Verified
1. **NativeWind styling on web** — App renders unstyled (no className processing). `postcss.config.js` + `autoprefixer` were added; `darkMode: 'class'` added to tailwind config. **Needs restart with `--clear` to verify.**
2. **Expo Go QR code on mobile** — User was scanning with camera app instead of Expo Go. Not yet confirmed working on device.
3. **Supabase phone auth** — Schema is applied but phone auth provider needs to be enabled in Supabase Dashboard. Test OTP numbers not yet configured.

### 🔲 Not yet done
1. **GitHub push** — Repo has no commits yet (`git status` shows all files as untracked). Need to `git init` + `git add` + `git commit` + push.
2. **Deployment** — Not started. Likely EAS Build for native, or Expo web deploy for web preview.
3. **Edge Functions deployment** — `supabase/functions/` not yet deployed (`supabase functions deploy`).
4. **Razorpay integration** — Currently simulated (shows Alert, no real SDK). Needs `react-native-razorpay` or WebView integration.
5. **HRA receipt PDF** — Edge Function exists but untested.

---

## How to Run Locally

```bash
# Install dependencies (already done)
npm install

# Start dev server (clears Metro cache)
npx expo start --clear

# Then:
# - Web: press W or open http://localhost:8081
# - Android: press A (emulator must be running)
# - iOS: press I (Mac only)
# - Physical device: open Expo Go → Scan QR Code (same WiFi required)
```

Port 8081 is sometimes occupied. Expo will offer 8082/8083 — say yes.

---

## How to Push to GitHub

```bash
cd c:\GitHub\Lease

git init
git add -A
# Note: .env is gitignored — secrets will NOT be committed
git commit -m "Initial commit: Flatvio rental management app"

# Create repo on github.com first, then:
git remote add origin https://github.com/Akhilchintu93/flatvio.git
git branch -M main
git push -u origin main
```

---

## How to Deploy (EAS — when ready)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # or ios / all
eas submit                     # to app stores
```

For web preview:
```bash
npx expo export --platform web
# Deploy the dist/ folder to Vercel / Netlify
```

---

## Supabase Edge Functions (when ready to deploy)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase login
supabase link --project-ref tuojgwrzfecyeiccdrlj

# Set secrets
supabase secrets set RAZORPAY_KEY_SECRET=xxx
supabase secrets set TWILIO_ACCOUNT_SID=xxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Deploy functions
supabase functions deploy send-whatsapp
supabase functions deploy create-payment-order
supabase functions deploy generate-hra-receipt
```

---

## Key Decisions & Constraints

- **India-only**: Phone numbers normalized to `+91XXXXXXXXXX`. Currency always INR. Rent due day capped at 28 (no 29/30/31 to avoid month-end issues).
- **Role is permanent**: Once a user picks landlord or tenant, it's stored in `profiles.role` and cannot be changed in-app.
- **One active rental per tenant**: Queries use `.single()` on tenant rentals — a tenant is expected to have one active rental at a time.
- **Invite token expires in 72 hours**: Set on rental creation. The `Public invite token lookup` RLS policy checks `invite_expires_at > now()`.
- **Photos compressed to 1200px wide, 80% JPEG quality** before upload (Config.maxPhotoSizeBytes = 5MB).
- **Payment is simulated**: `pay-rent.tsx` calls the Edge Function to create a Razorpay order but then shows an Alert to simulate payment. Real Razorpay SDK not yet integrated.
- **NativeWind v4 + TailwindCSS v3** — must stay on tailwindcss v3.x. Do NOT upgrade to tailwindcss v4 (incompatible with nativewind v4).

---

## Git Info

- **Repo location**: `c:\GitHub\Lease`
- **Branch**: `main`
- **Git user**: `Akhilchintu93`
- **No commits yet** — all files are untracked as of this session
