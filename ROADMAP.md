# Flatvio — Product Roadmap

> **Goal:** Be the best rental management app in India by winning on three pillars:
> 1. **Best tenant experience** — tenants are the growth vector. Each landlord brings 1 tenant. Each happy tenant might become tomorrow's landlord.
> 2. **Deepest trust layer** — photo proof, deposit protection, dispute resolution. No competitor has this as a core feature.
> 3. **India-first compliance** — HRA, L&L agreements, Aadhaar/PAN, WhatsApp-first communication.

> Living document. Priority = P0 (fix now) → P1 (Month 1–2) → P2 (Month 2–3) → P3 (Month 3–4) → P4 (6+ months)

---

## P0 — Fix Now (Bugs & Blockers)

- [x] **Rules of Hooks violation on tenant dashboard** — `sparklinePoints` useMemo was after early return causing React error #310 on tenant join. Moved before `if (isLoading)`.
- [ ] **Deploy Twilio WhatsApp Edge Function** — Function exists at `supabase/functions/send-whatsapp/`. Run `supabase functions deploy send-whatsapp` and set `TWILIO_*` secrets. Without this, WhatsApp rent reminders never fire.
- [ ] **Deploy Razorpay Edge Function** — `supabase/functions/create-payment-order/` needs `supabase functions deploy create-payment-order` and `RAZORPAY_KEY_SECRET` secret set.
- [ ] **Enable pg_cron for overdue marking** — Migration `007` marks payments overdue automatically. Enable pg_cron in Supabase dashboard → Extensions, then run the migration SQL.
- [ ] **HRA receipt Edge Function** — Deploy `supabase/functions/generate-hra-receipt/` so tenants can generate PDF receipts. Currently the button exists but the function isn't live.
- [ ] **Fix join deep-link on web** — `flatvio://` scheme doesn't work on web. Detect platform and use `https://flatvio.in/join/[token]` as the share URL for web users.

---

## P1 — Month 1–2 (Competitive Necessity)

### Notifications & Communication
- [ ] **Automated rent reminder push notifications** — 3 days before due date, 1 day before, day of. Use `scheduleRentReminder` in `lib/notifications.ts` which already exists. Wire it up when a rental activates.
- [ ] **WhatsApp rent reminder** — Call the Twilio Edge Function on the same schedule. Indian tenants respond to WhatsApp 5× faster than push.
- [ ] **Landlord notification when tenant joins** — Currently no push is sent to landlord when `invite_token` is consumed. Add notify call in the join flow.
- [ ] **In-app notifications screen** — The `/(tenant)/notifications` and `/(landlord)/actions` routes are referenced but not fully implemented. Build a clean notification list screen.

### Landlord Repairs Dashboard
- [ ] **All-properties repairs list for landlord** — Currently landlord must navigate into each property to see repairs. Add a dedicated `/repairs` tab in landlord tab bar showing all open/in-progress repairs across all properties, sortable by priority and property.
- [ ] **Landlord repair response** — Landlord can add a note, change status (open → in_progress → resolved), and attach a photo. The `landlord_note` field exists in DB but there's no UI for landlords to write to it.
- [ ] **Repair priority escalation** — Visually escalate urgent repairs: red border, sorted to top, push notification with urgency indicator.

### Analytics & Insights (Landlord)
- [ ] **Occupancy rate metric** — (Active rentals / Total properties) × 100. Show on dashboard as a ring or stat card.
- [ ] **Per-property payment health** — In the property detail, show a heatmap or bar chart of the last 12 months: green = paid on time, yellow = paid late, red = overdue. Gives landlord instant history at a glance.
- [ ] **Average days to pay** — How many days after due date does each tenant typically pay. Surface in property detail to help landlords identify slow payers.
- [ ] **YTD income by property** — Breakdown of the landlord's annual income attributed to each property. Currently total YTD exists, but not split by property.

### Tenant Experience
- [ ] **Rent history improvements** — Running total of rent paid since move-in. Receipt download button per payment (HRA PDF). Payment method badge (UPI / Cash). Currently all this data exists in DB but the UI is minimal.
- [ ] **Deposit screen upgrade** — Show deposit balance prominently (paid − deductions), list each deduction with landlord's reason and date, show expected refund date if rental has ended. The `deposit_transactions` table exists.
- [ ] **Agreement screen upgrade** — Show signing status for both parties clearly. If not signed, show a prominent "Sign Now" banner. After signing, show signed date + a "Download PDF" button that generates the agreement as a PDF.

---

## P2 — Month 2–3 (Differentiation — Build the Moat)

### Photo Proof — The Killer Feature
- [ ] **Side-by-side move-in vs move-out comparison** — Landlord proof review screen should show move-in photo and move-out photo for the same room label side by side. This is the feature that prevents every deposit dispute. No competitor has this.
- [ ] **Proof dispute flow** — Landlord can mark individual rooms as "disputed" with a note. Tenant gets notified and can respond. Creates a documented paper trail. Connects to deposit deduction UI.
- [ ] **Proof share link** — Generate a shareable URL for the move-in proof (e.g., for court/insurance purposes). The photos are already public in Supabase Storage.
- [ ] **Room labels customization** — Currently hardcoded labels (Hall, Bedroom, Kitchen…). Let landlords define custom labels per property (e.g., "Terrace", "Servant Quarter").

### Calculators & Tools (Acquisition + Retention)
- [ ] **Rent estimator calculator** — Input: city, locality, BHK type, furnishing, floor. Output: estimated rent range based on market data. Drives SEO. Can be a simple screen under a "Tools" tab.
- [ ] **Stamp duty calculator** — State-wise 2026 rates. Input: rent, duration, city. Output: stamp duty amount and where to pay. Rivals include this — it's a high-search-volume feature.
- [ ] **HRA tax benefit calculator** — How much HRA exemption can a tenant claim? Input: salary, HRA received, rent paid, city. Output: exempt amount. Very high value for salaried tenants.
- [ ] **Rent increase calculator** — Based on CPI or a fixed percentage, project rent increases over the lease duration. Useful for landlords when discussing renewal.
- [ ] **ROI calculator** — For landlords: input property cost, rent, maintenance, taxes. Output: annual yield %. Drives landlord acquisition.

### Communication
- [ ] **In-app chat between landlord and tenant** — A simple message thread per rental. Not a full messenger — just text messages tied to the rental context. Replaces WhatsApp for rental-related communication and keeps everything documented.
- [ ] **Broadcast message** — Landlord with multiple properties can send a message to all active tenants at once (e.g., "Water supply off tomorrow 9am–1pm").

### Compliance & Documents
- [ ] **Leave & License agreement improvements** — Current generation is basic. Add: specific property details, witness fields, stamp duty clause, lock-in period, notice period clause, maintenance terms. Should be court-admissible.
- [ ] **Annual HRA summary PDF** — Full-year receipt summary for IT filing (April–March). One button, one PDF with all 12 months. This is high value for tenants every January–March.
- [ ] **Aadhaar/PAN verification badge** — Landlords can upload their PAN and optionally Aadhaar (last 4). Show a "Verified Landlord" badge on the tenant's view of their landlord card. Builds trust.

---

## P3 — Month 3–4 (Growth & Retention)

### Growth Loops
- [ ] **Referral program** — Tenant invites their next landlord or vice versa. Track in `profiles` table via referral code. Show referral count on profile screen. Consider a small reward (₹50 Amazon voucher or 1 free month of premium).
- [ ] **Landlord invite via WhatsApp** — After tenant joins, app asks: "Know another landlord? Share Flatvio." Pre-drafted WhatsApp message with referral link.
- [ ] **Public property profile page** — `/property/[token]` web page showing property name, location, landlord name, rent — publicly shareable. Landlord uses this instead of verbal descriptions when advertising. Not a full marketplace, but helps with discovery.

### Lease Lifecycle
- [ ] **Lease renewal workflow** — 60 days before end date, landlord gets a reminder. One-tap to send a renewal offer with new terms to tenant. Tenant accepts or counter-offers in-app.
- [ ] **Move-out initiation flow** — Currently `pending_moveout` status exists but the UX for initiating it is unclear. Add a clear "Initiate Move-out" button in property detail with date picker and notice period confirmation.
- [ ] **Security deposit refund tracking** — When rental ends, create a checklist: photos reviewed, deductions agreed, refund amount confirmed, refund paid (with UPI reference). Both parties see the same status.

### Platform Improvements
- [ ] **Offline support** — Cache the last fetched rental data so tenants can see their rent amount and due date without internet. Critical in areas with patchy connectivity.
- [ ] **Dark mode** — System preference respected. All color tokens already support theming; just map them.
- [ ] **Accessibility** — Screen reader labels, minimum touch targets, sufficient contrast ratios.
- [ ] **Error monitoring (Sentry)** — Currently errors are silent in production. Add `sentry-expo` so bugs like the #310 error are caught before users report them.

---

## P4 — Long Term (6+ months)

### Monetization
- [ ] **Flatvio Pro (₹999/month for landlords)** — Unlimited rentals + advanced analytics + priority support + document storage. Free tier: 1 active rental.
- [ ] **Premium tenant verification** — Police verification form, references, employment proof upload. Landlord pays ₹199 per tenant verification request.
- [ ] **Landlord + Tenant Premium Bundle** — Landlord pays, tenant gets premium features (enhanced proof, unlimited photo storage, chat history).

### Platform Expansion
- [ ] **Caretaker role** — View assigned properties, manage repairs, update task status. Important for PG operators, apartment complexes, building managers.
- [ ] **Property marketplace listing** — Public listing with photos, price, amenities. Zero-brokerage. Monetize via featured listings or lead generation.
- [ ] **Web dashboard for landlords** — Desktop-first view for landlords managing 5+ properties. Mobile is great for tenants; landlords with large portfolios want spreadsheet-like views.
- [ ] **Hindi language support** — Translated UI for the Hindi-speaking belt (UP, Bihar, Rajasthan, MP). Massive TAM unlock.
- [ ] **Aadhaar e-sign on agreements** — Legally binding digital signature via Aadhaar OTP. Makes agreements court-admissible without physical stamp paper.
- [ ] **GST on rent tracking** — For commercial properties where tenant pays GST on rent. Auto-calculate and include in receipts.
- [ ] **Tenant credit report** — At end of tenancy, landlord rates tenant (payment timeliness, property care). Tenant's rental history becomes a portable credit-like score for future landlord applications.

---

## Infrastructure & DevOps

- [ ] **EAS Build setup** — Configure `eas.json` for Android + iOS production builds. Set up GitHub Actions trigger.
- [ ] **App Store + Play Store submission** — Bundle IDs, screenshots, store listings.
- [ ] **Production domain** — `flatvio.in` with proper SSL, redirect all `flatvio://` deep links to HTTPS equivalents.
- [ ] **PostHog / Mixpanel analytics** — Track key events: rental_created, tenant_joined, payment_submitted, proof_uploaded. Essential for product decisions.
- [ ] **Database backups** — Supabase auto-backups enabled and tested.
- [ ] **Rate limiting on Edge Functions** — Prevent abuse of WhatsApp/Razorpay endpoints.

---

## Competitive Position Summary

| Dimension | Flatvio Today | Target State | Rentrovio |
|---|---|---|---|
| Tenant UX | ✅ Strong | Best in market | ⚠️ Landlord-centric |
| Photo proof | ✅ Unique | Side-by-side comparison | ❌ Not present |
| Deposit protection | ✅ Basic | Full dispute + refund flow | ❌ Not highlighted |
| HRA receipts | ✅ | Annual PDF summary | ✅ |
| Rent collection | ✅ UPI + Cash | Automated reminders | ✅ Automated |
| Analytics | ⚠️ Basic | Per-property health | ✅ Dashboard |
| Calculators | ❌ | 5 tools | ✅ 9 tools |
| WhatsApp | ⚠️ Not deployed | Automated triggers | ❌ Not mentioned |
| Marketplace | ❌ | Public property page | ✅ Full marketplace |
| Pricing | Free | Freemium (₹999/mo Pro) | Free + ₹10K marketplace |
