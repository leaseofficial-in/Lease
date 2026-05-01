# Flatvio

Flatvio is a landlord-tenant rental management app that makes renting trustworthy — handling rent collection, move-in proof, deposit tracking, repair requests, and digital agreements in one place.

## Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- Supabase CLI: `brew install supabase/tap/supabase` (macOS) or see [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)
- EAS CLI (for builds): `npm install -g eas-cli`

## Setup

```bash
# 1. Clone
git clone https://github.com/leaseofficial-in/Lease.git
cd Lease

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 4. Initialize Supabase (if using local dev)
supabase init
supabase start

# 5. Run migrations
supabase db push
# or for local dev:
supabase migration up

# 6. Set Edge Function secrets
supabase secrets set RAZORPAY_KEY_SECRET=xxx
supabase secrets set TWILIO_ACCOUNT_SID=xxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
supabase secrets set TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"

# 7. Deploy Edge Functions
supabase functions deploy send-whatsapp
supabase functions deploy create-payment-order
supabase functions deploy generate-hra-receipt

# 8. Start the app
npx expo start
```

## Running on your phone

1. Install **Expo Go** from the App Store or Play Store
2. Run `npx expo start`
3. Scan the QR code with Expo Go (Android) or the Camera app (iOS)

## Building for production

```bash
# Configure EAS
eas build:configure

# Build for Android
eas build --platform android --profile production

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

## Folder structure

```
app/
  (auth)/          # Welcome, OTP login, role selection
  (landlord)/      # Landlord dashboard, create rental, property detail, proof review, payments
  (tenant)/        # Tenant dashboard, join, proof upload, repairs, deposit, agreement, payments
  join/[token].tsx # Deep link handler for invite URLs

components/
  ui/              # Reusable primitives (Button, Card, Input, Avatar, BottomSheet, …)
  rental/          # Domain components (RentalCard, DepositCard, RentStatusBadge, ActivityFeed)
  proof/           # Photo grid, room tabs, annotation modal
  payment/         # Payment method selector

lib/
  supabase.ts      # Supabase client with SecureStore adapter
  formatters.ts    # Currency, date, phone formatters + status label maps
  storage.ts       # Photo upload helpers (compress → upload to Supabase Storage)
  notifications.ts # Expo push notification registration + scheduling
  razorpay.ts      # Razorpay order creation and payment verification

stores/
  authStore.ts     # Zustand: session, profile, role, sign-out
  rentalStore.ts   # Zustand: active rental + landlord rental list
  uiStore.ts       # Zustand: toasts, bottom sheet state

hooks/             # TanStack Query wrappers for all data fetching
types/index.ts     # All TypeScript domain types (zero `any`)
constants/         # Theme tokens and app config

supabase/
  migrations/001_schema.sql  # Full PostgreSQL schema with RLS
  functions/
    send-whatsapp/           # Twilio WhatsApp notifications
    create-payment-order/    # Razorpay order creation
    generate-hra-receipt/    # HTML rent receipt generator
```

## Key decisions

| Decision | Reason |
|---|---|
| Expo managed workflow | Fastest path to both stores; no native code required for MVP |
| NativeWind v4 | Tailwind utility classes work natively — consistent design tokens, zero StyleSheet boilerplate |
| Supabase Phone OTP | No password friction; Indian landlords and tenants are phone-first |
| SecureStore + AsyncStorage fallback | SecureStore has a 2 KB limit; tokens over this size are transparently stored in AsyncStorage |
| TanStack Query + Zustand | Server state (remote data) lives in TQ; client/UI state lives in Zustand — no mixing |
| Razorpay Edge Function | Secret key never leaves the server; client only sees the order ID |
| RLS on every table | Each user only sees rows they own or are party to — enforced at the database level |
| `proof_photos` separate from `proofs` | Allows streaming individual photo uploads without blocking the proof record |
