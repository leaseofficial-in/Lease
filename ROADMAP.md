# Flatvio — Product Roadmap

> Living document. Check off tasks as they ship. Add notes under each item when done.
> Priority order reflects business impact + acquisition appeal.

---

## Legend
- `[ ]` Not started
- `[x]` Shipped
- `[-]` In progress
- `[~]` Partially done / stubbed

---

## 1. Rental Agreement PDF Generation
> **Why:** Every landlord needs a legally presentable agreement. Services charge ₹500–2000 for this. This is the "holy shit" moment that drives referrals — landlord creates rental, gets a real PDF in seconds.

- [x] Create `generate-rental-agreement` Edge Function
- [x] Pull all required data: landlord name + PAN, tenant name + Aadhaar last4, property address, rental terms, start/end dates
- [x] 16-clause Leave & License Agreement (legally correct Indian format, not a tenancy)
- [x] Amount in words (Indian number system — lakhs, crores), ordinal due dates, all party details
- [x] Upload to `agreements` Supabase Storage bucket, store URL in `rentals.agreement_url`
- [x] "Generate Agreement" / "View Agreement" / "Regenerate" buttons on landlord property detail
- [x] Tenant signed stamp rendered in the agreement when `agreement_signed_at` is set
- [x] Print-to-PDF button in the HTML (browser native, no extra dependency)
- [ ] Deploy Edge Function: `supabase functions deploy generate-rental-agreement`
- [ ] Make `agreements` bucket public in Supabase Dashboard (Storage → agreements → Make Public)
- [ ] Auto-regenerate agreement when tenant signs (re-render with signed stamp)
- [ ] Add "View Agreement" deep link from tenant agreement screen (URL already stored in rental)

**Notes:**
Shipped 2026-05-01. Output is HTML stored in the agreements bucket. Tenant can print-to-PDF from the browser. Format: Leave & License (not Rental/Lease) — avoids Rent Control Act protections. Period: 11 months to avoid mandatory registration under Registration Act 1908.

---

## 2. HRA Receipt Auto-Generation
> **Why:** Tenants paying ₹15k–60k/month can save ₹18,000–75,000/year in taxes by claiming HRA exemption. They need a landlord-signed receipt every month. This is the feature that makes tenants *ask their landlord to use Flatvio* — built-in viral loop.

- [ ] Fix and test existing `generate-hra-receipt` Edge Function (currently exists but untested)
- [ ] Generate monthly receipt: tenant name, landlord name + PAN, property address, rent amount, month, payment date
- [ ] Store receipt URL in `rent_payments.receipt_url`
- [ ] Auto-generate receipt when payment status flips to `paid`
- [ ] Add "Download HRA Receipt" button in tenant rent history screen (link already exists in UI, just needs URL)
- [ ] Add "Generate All Receipts for FY 2025–26" bulk action in tenant rent history
- [ ] Show personalized tax savings estimate on tenant dashboard: "Generate receipts → Save up to ₹X this year"
- [ ] WhatsApp tenant when receipt is ready (use existing Twilio Edge Function)

**Notes:**
<!-- Add implementation notes here when shipped -->

---

## 3. Move-Out Flow + Deposit Settlement
> **Why:** Move-out is where all the pain is — deposit deductions, photo disputes, legal threats. This is the feature that makes the app irreplaceable once started. Landlords who begin a move-out in Flatvio cannot leave.

- [ ] Add "Initiate Move-Out" action on landlord property detail screen (sets move-out date on rental)
- [ ] Tenant: upload move-out photos (same room tabs as move-in — reuse `proof/upload.tsx` with `proof_type = 'move_out'`)
- [ ] Landlord: review move-out proof screen — add side-by-side comparison (move-in vs move-out per room)
- [ ] Deposit settlement sheet: landlord adds deduction line items, each optionally linked to a photo
- [ ] Auto-calculate refund: `security_deposit - total_deductions`
- [ ] Both parties confirm settlement (tenant must acknowledge deductions)
- [ ] Generate deposit settlement PDF (summary of deductions + photos + final refund amount)
- [ ] Mark rental as `closed` after settlement confirmed
- [ ] Add move-out events to activity timeline
- [ ] Send WhatsApp notifications to both parties at each step

**Notes:**
<!-- Add implementation notes here when shipped -->

---

## 4. UPI Intent Payments + Cash Recording (Zero Commission)
> **Why:** Razorpay charges ~2% per transaction — on ₹25,000 rent that's ₹500/month in fees that someone has to absorb. For first users, commission-free is the right call. UPI Intent opens GPay/PhonePe directly, money goes landlord-to-tenant with zero intermediary. Once there's volume, a gateway can be layered on top.
>
> **How it works:** Landlord sets their UPI ID in profile → Tenant taps "Pay via UPI" → native UPI chooser opens (GPay, PhonePe, Paytm, BHIM) → Tenant pays → returns to Flatvio → enters optional UTR → payment marked `pending_verification` → Landlord sees "Tenant paid" card and taps "Confirm Receipt" → status becomes `paid`. Cash payments follow same confirm flow.

- [x] Add `upi_id` field to Profile type and landlord profile form
- [x] Add `pending_verification` to `PaymentStatus` type
- [x] Add `utr_number`, `payment_method`, `payment_note` fields to `RentPayment` type
- [x] Create `lib/upi.ts` — `openUPIPayment()` builds UPI intent URL, opens via `Linking.openURL`
- [x] Rewrite `pay-rent.tsx` — UPI button + cash recording + UTR confirmation on AppState return
- [x] Landlord property detail — "Confirm Receipt" card for `pending_verification` payments
- [x] Update `StatusPill` and `formatters.ts` for `pending_verification` status
- [ ] Run DB migration: add `upi_id` to profiles, add `utr_number`/`payment_method`/`payment_note` to rent_payments, add `pending_verification` to status check constraint
- [ ] Test UPI intent on Android (standard `upi://` scheme)
- [ ] Test on iOS — may need `tez://` (Google Pay) or `phonepe://` as fallbacks
- [ ] Add landlord notification when tenant submits payment (push + WhatsApp)
- [ ] Add auto-confirm after 48h if landlord doesn't dispute (Edge Function cron)

> **Razorpay (future):** Add as an optional premium tier later — landlords who want instant confirmation and don't want to manually confirm can enable it. By then you have the user base to justify the fee.

**Notes:**
Shipped 2026-05-01. No payment gateway fees. Money moves via UPI or cash directly between landlord and tenant. Flatvio is the ledger, not the processor.

---

## 5. Landlord Tax Dashboard
> **Why:** Every April, landlords scramble for rental income numbers for ITR filing. A one-screen report positions Flatvio as essential during tax season — the highest organic acquisition window of the year.

- [ ] New screen `app/(landlord)/tax.tsx` — annual rental income report
- [ ] Show: total rental income per property, total TDS applicable (rent >₹50k/month), payments received vs pending
- [ ] Financial year selector (FY 2024–25, FY 2025–26)
- [ ] Export as CSV (email / share sheet)
- [ ] Export as PDF for CA submission
- [ ] TDS guidance: if any property's monthly rent exceeds ₹50k, show TDS deduction reminder with Form 26QC instructions
- [ ] Add tax report tab to landlord dashboard navigation
- [ ] ITR deadline reminder push notification (schedule for June 30 each year)

**Notes:**
<!-- Add implementation notes here when shipped -->

---

## 6. Tenant Rent Score (Retention + Viral Loop)
> **Why:** Tenants with a 6-month payment track record get a shareable "Flatvio Rent Score." When they look for their next flat, they share it with the new landlord. New landlord signs up. This is the B2C viral flywheel.

- [ ] Design score algorithm: base 500, +50 per on-time payment, -100 per late payment, -200 per overdue, max 1000
- [ ] Add Rent Score card to tenant dashboard (visible after 2+ payments)
- [ ] Score breakdown: "6 payments — 5 on time, 1 late"
- [ ] "Share my Rent Score" button → generates a shareable PNG/PDF card with score, track record, verified badge
- [ ] Lock score sharing behind email verification (prevents abuse)
- [ ] Show score history trend (sparkline — month by month)
- [ ] Score nudge: "Pay before the 3rd to keep your score at 850"
- [ ] Future: partner with CRIF/Experian for formal credit bureau reporting

**Notes:**
<!-- Add implementation notes here when shipped -->

---

## 7. Property Manager Role (B2B Unlock)
> **Why:** Many Indian landlords (NRI, HNI) hire property managers. This role unlocks the B2B story: property management companies managing 50–500 units using Flatvio. Enterprise revenue and acquisition appeal.

- [ ] Add `property_manager` to `profiles.role` enum (or use a separate `rental_managers` join table)
- [ ] Landlord: "Invite Property Manager" flow on property detail screen
- [ ] Manager permissions: add deposit entries, close repair requests, review proofs, send reminders, view payment history
- [ ] Manager restrictions: cannot change rental terms, cannot settle deposit, cannot delete rental
- [ ] Landlord gets read-only view + approval required for deposit deductions above a threshold
- [ ] Manager sees a multi-property dashboard (all properties they manage, not just one landlord)
- [ ] Update RLS policies in Supabase to allow manager access per rental
- [ ] Manager-specific tab layout and navigation

**Notes:**
<!-- Add implementation notes here when shipped -->

---

## 8. Subscription Model (Pro Tier)
> **Why:** Clear SaaS model is required for any acquirer to assign recurring revenue multiple. Free tier hooks users; Pro converts on second property or first tax season.

- [ ] Design pricing screen `app/(landlord)/upgrade.tsx`
- [ ] Define Pro feature gates: unlimited properties, agreement PDF, HRA auto-receipts, tax report, WhatsApp reminders, priority support
- [ ] Integrate RevenueCat (cross-platform in-app purchase management) or Razorpay Subscriptions
- [ ] Free tier: 1 active property, manual HRA receipt, basic agreement
- [ ] Pro tier (₹499/month or ₹3999/year): unlimited properties, auto HRA receipts, tax PDF, WhatsApp notifications
- [ ] Gate Pro features with a `useProAccess()` hook that checks subscription status
- [ ] Add upgrade prompt on feature-gate touch (non-blocking, dismissable)
- [ ] Webhook to Supabase when subscription activates/cancels (update `profiles.is_pro`)
- [ ] 7-day free trial for new landlords

**Notes:**
<!-- Add implementation notes here when shipped -->

---

## 9. WhatsApp-First Notifications
> **Why:** Indian landlords and tenants live on WhatsApp. A WhatsApp message from your landlord saying "Your rent is due on the 5th — pay here" converts dramatically better than a push notification. Twilio is already wired up but not activated.

- [x] Twilio Edge Function `send-whatsapp` exists
- [ ] Activate Twilio WhatsApp sandbox / production number (Supabase secrets already defined)
- [ ] Rent due reminder: 5 days before due day → tenant WhatsApp with deep link to pay-rent screen
- [ ] Rent received confirmation: when payment status → paid → landlord WhatsApp "₹X received from [tenant]"
- [ ] Repair status update: when landlord changes repair status → tenant WhatsApp
- [ ] Move-in proof submitted: landlord WhatsApp notification with link to review
- [ ] Move-out initiated: tenant WhatsApp with checklist
- [ ] HRA receipt ready: tenant WhatsApp with PDF link
- [ ] Add opt-out preference to profile settings (WhatsApp notifications on/off)
- [ ] Implement Twilio message templates for each event type (required for production WhatsApp)

**Notes:**
<!-- Add implementation notes here when shipped -->

---

## 10. Onboarding Overhaul
> **Why:** New landlords land on an empty dashboard with one button and leave. The first 60 seconds determine whether they ever come back. A walkthrough + demo mode + referral hook changes retention dramatically.

- [ ] First-run walkthrough: 3-screen intro ("Here's what Flatvio does") shown once after role selection
- [ ] Demo mode: "See a sample rental" button on empty landlord dashboard — shows a pre-populated demo rental (read-only, clearly labelled "Demo")
- [ ] Empty state redesign: landlord empty dashboard shows value props + "Create your first rental" CTA with estimated setup time ("~3 minutes")
- [ ] Referral code embedded in invite token: when landlord shares invite link, URL includes `ref=LANDLORDID`
- [ ] Referral tracking: if tenant joins via ref link and their landlord later signs up, record attribution
- [ ] Referral reward: landlord gets 1 month Pro free when their invited tenant makes first payment
- [ ] Progress indicator on setup: landlord dashboard shows "Setup checklist" until rental is active (create rental → invite tenant → tenant joins → move-in proof → first payment)
- [ ] Re-engagement push: if landlord has a rental but no tenant after 48 hours, send "Need help inviting your tenant?" nudge

**Notes:**
<!-- Add implementation notes here when shipped -->

---

## Immediate Ship Blockers

> Nothing works reliably in production without these. Do before anything else.

- [ ] **Automated overdue marking** — Enable `pg_cron` extension in Supabase and add a daily job:
  ```sql
  SELECT cron.schedule('mark-overdue', '0 9 * * *', $$
    UPDATE rent_payments SET status = 'overdue', updated_at = now()
    WHERE status = 'pending' AND due_date < CURRENT_DATE;
  $$);
  ```
- [ ] **Deploy EAS Build** — `eas build --platform all` then `eas submit` for iOS/Android. `npx expo export --platform web` → Vercel for web preview.
- [ ] **Deploy all Edge Functions** — `supabase functions deploy` for `send-whatsapp`, `create-payment-order`, `generate-hra-receipt`, `generate-rental-agreement`. Set all Supabase secrets.
- [ ] **Landlord repairs screen** — `app/(landlord)/repairs/[rentalId].tsx` is referenced in `property/[id].tsx` but doesn't exist. Landlords cannot respond to repair requests. Needs: list view, status update (open → in_progress → resolved), landlord note field. Add `landlord_note TEXT` column to `repair_requests`.
- [ ] **In-app notification inbox** — `notifications` table is already populated by existing flows. Needs a screen for both roles. Add tab bar icon with unread badge count. Tapping a notification navigates to the relevant screen.

---

## Infrastructure & Reliability

### Error Monitoring (Sentry)
- [ ] `npx expo install @sentry/react-native`
- [ ] `Sentry.init({ dsn: '...' })` in `app/_layout.tsx`
- [ ] Wrap root layout in `Sentry.wrap()`
- [ ] Free tier covers ~5k errors/month — enough for early growth
- [ ] **Do this before any user touches prod.** You need to know when things break.

### Product Analytics (PostHog)
- [ ] `npm install posthog-react-native`
- [ ] Key events to track: `landlord_created_rental`, `tenant_joined_rental`, `payment_submitted`, `proof_uploaded`, `agreement_signed`
- [ ] Funnel: landlord signup → first rental created → tenant joined → first payment confirmed
- [ ] Can't improve what you can't measure

### CI/CD (GitHub Actions)
- [ ] Create `.github/workflows/ci.yml`
- [ ] On every push: `npm install` → `npx tsc --noEmit` → `npx expo export --platform web`
- [ ] On merge to main: trigger EAS preview build
- [ ] Prevents broken TypeScript reaching users

### Database Indices
Run in Supabase SQL Editor — these queries fire on every screen load:
```sql
CREATE INDEX IF NOT EXISTS idx_rent_payments_rental_month   ON rent_payments(rental_id, month);
CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant_month   ON rent_payments(tenant_id, month);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read      ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_repair_requests_rental       ON repair_requests(rental_id, status);
CREATE INDEX IF NOT EXISTS idx_rentals_landlord_status      ON rentals(landlord_id, status);
CREATE INDEX IF NOT EXISTS idx_rentals_tenant               ON rentals(tenant_id);
```

### Supabase Connection Pooling
- [ ] Dashboard → Settings → Database → Connection Pooling → Enable PgBouncer (Transaction mode)
- [ ] Update `EXPO_PUBLIC_SUPABASE_URL` to use the pooler endpoint (port 6543)
- [ ] Required before ~200 concurrent users — Postgres default connection limit will exhaust

---

## India-Specific Trust & Compliance

### Tenant KYC / Aadhaar Verification
- [ ] Integrate DigiLocker API or a KYC provider (Setu, Karza, Signzy)
- [ ] Flow: tenant joins rental → "Complete KYC" prompt → Aadhaar + PAN verification → verified badge on tenant profile
- [ ] Landlords will not trust the app without knowing who their tenant is — this is table-stakes for the Indian market

### Police Verification Form
- [ ] Generate a pre-filled PDF tenants can take to their local police station
- [ ] Fields: tenant name, photo, DOB, permanent address, rental address, landlord name + contact
- [ ] Reuse agreement PDF infrastructure — cost is near zero, trust signal is huge

### TDS Reminders
- [ ] If `monthly_rent > 50000`, show a banner on `pay-rent.tsx`: "Your rent exceeds ₹50,000/month. You're required to deduct 10% TDS and file Form 26QC. [Learn more →]"
- [ ] Landlord side: show TDS received amount on tax dashboard
- [ ] Annual reminder push notification before March 31 (TDS filing deadline)

### Rent Agreement Registration Guidance
- [ ] Agreements > 11 months legally require registration in most Indian states
- [ ] After agreement is generated, show checklist: stamp duty amount (state-specific), nearest registration office, required documents
- [ ] States to handle first: Maharashtra, Telangana, Karnataka, Delhi, Tamil Nadu

---

## Quick Wins (under 1 hour each)

| Task | File | What to do |
|---|---|---|
| Repair photo upload | `(tenant)/repairs.tsx` | Add `ImagePicker` + `uploadRepairPhoto()` to new repair form |
| Landlord UPI missing warning | `(landlord)/profile.tsx` | Banner if `upi_id` is empty: "Add your UPI ID so tenants can pay you" |
| Payment method icon in history | `(tenant)/rent-history.tsx` | Show UPI/cash Ionicons per payment row based on `payment_method` |
| Tenant "no rental" CTA | `(tenant)/index.tsx` | Empty dashboard → show "Join a rental" button linking to `/(tenant)/join` |
| Property type icon on dashboard | `(landlord)/index.tsx` | Show `business/home/bed/storefront` Ionicons per rental card |
| Copy invite from tenant join screen | `(tenant)/join.tsx` | "Copy token" button next to the input so tenants can paste from clipboard |
| Date picker for rental start date | `(landlord)/create-rental.tsx` | Replace free-text `YYYY-MM-DD` with `@react-native-community/datetimepicker` |
| Pincode → auto-fill city/state | `(landlord)/create-rental.tsx` | Call India Post API on 6-digit pincode input |

---

## Technical Debt

- [ ] Remove all remaining static `className` usage in `components/` — convert to inline styles for consistency with screens
- [ ] Remove `lib/localRentals.ts` and `lib/devAuth.ts` dev-auth paths before prod — they bypass all real Supabase logic and are a security risk if left in
- [ ] `isDevAuthUserId()` checks scattered across every screen — gate behind `__DEV__` flag or remove entirely
- [ ] `lib/confirm.ts` uses `Alert.alert` on native — replace with a proper in-app modal (`BottomSheet` variant) for consistency
- [ ] `supabase/migrations/001_schema.sql` is monolithic — split into individual migration files as schema evolves

---

## Architecture (Non-Feature Work)

### Real-Time Subscriptions
> Supabase supports `supabase.channel().on('postgres_changes')`. When tenant pays, landlord dashboard updates instantly.

- [ ] Subscribe to `rent_payments` changes on landlord dashboard — invalidate React Query cache on INSERT/UPDATE
- [ ] Subscribe to `repair_requests` changes on both landlord and tenant views
- [ ] Subscribe to `notifications` table — badge count updates without pull-to-refresh
- [ ] Subscribe to `proofs` status changes on landlord proof review screen

### Audit Trail (Legal Moat)
> Every action should have a timestamped, immutable log. Makes data legally defensible and extremely valuable to acquirers.

- [ ] Add `audit_log` table: `id`, `rental_id`, `actor_id`, `action_type`, `payload_before` (jsonb), `payload_after` (jsonb), `created_at`
- [ ] Log all deposit transactions (already partially tracked)
- [ ] Log proof approvals, rejections, disputes
- [ ] Log agreement signing
- [ ] Log rental term edits (before + after)
- [ ] Log repair status transitions
- [ ] Expose audit log as read-only "History" tab on landlord property detail screen

---

## Shipped Log

| Date | Feature | Notes |
|---|---|---|
| 2026-05-01 | Google OAuth login | Replaced phone OTP. `devAuth.ts` stubbed. `auth/callback` now routes via AuthGate. |
| 2026-05-01 | UPI Intent + Cash payments | Zero-commission payment flow. Landlord sets UPI ID, tenant pays via GPay/PhonePe/cash, landlord confirms. No gateway fees. |
| 2026-05-01 | Leave & License Agreement PDF | 16-clause legally correct Indian L&L agreement. HTML output with print-to-PDF. Covers all standard clauses. Auto-stores URL in rental record. |

---

*Last updated: 2026-05-03*
