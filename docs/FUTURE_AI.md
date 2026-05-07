# RentyBase — AI-Native Transformation Strategy

> Written: May 2026. This is a living document. Update it as we execute.

---

## 1. Threat Analysis — Why This Is Urgent

The rental management space is about to be compressed by AI the same way fintech compressed banking — not gradually, but all at once once a credible player ships the right feature.

**The threat isn't a startup. It's a feature.**

NoBroker or Square already have the distribution. The moment either ships "AI lease assistant" or "automated rent reminder with dispute resolution," the category collapses for everyone without an AI moat. You have 12-18 months before this happens at scale in India.

**What incumbents cannot do fast:**
- They have legacy monolithic schemas (no event log, no actor attribution)
- They have compliance overhead that slows AI product launches
- They have no tenant trust graph (they treat every new rental as zero-context)

**What we can do that they cannot:**
- Build AI-native from day one while still small
- Wire every action to an event store before we have millions of users (retrofit is impossible at scale)
- Ship the Tenant Reliability Score before they realize it's the moat

---

## 2. Survival Strategy — The 3-Layer Defense

### Layer 1: Automation moat (0-6 months)
Make the landlord's job so automated they'd have to fire themselves to leave. Every manual action they do today becomes a trigger for an agent.

- Rent reminder → WhatsApp agent fires automatically
- Tenant misses payment → escalation sequence kicks in
- Proof photo uploaded → AI condition report generated
- Repair raised → landlord notified + response timer starts

### Layer 2: Trust graph moat (6-18 months)
The **Tenant Reliability Score** is a network effect. Once enough landlords report on enough tenants, the score becomes self-reinforcing. A landlord who contributes data gets better data back. This is a graph that grows in value with every user.

### Layer 3: Legal document moat (12-36 months)
AI-generated, jurisdiction-aware rental agreements with automatic renewal, clause negotiation, and court-ready dispute packages. No one else in India is building this properly. This is the eventual defensible position.

---

## 3. Product Evolution — The 4 Stages

### Stage 1: Automated assistant (now → 6 months)
Rule-based agents. No LLM required. Pure workflow automation.
- WhatsApp rent reminders on day 1, 3, 7 of overdue
- Photo upload triggers condition diff report
- Repair requests → SLA tracking → landlord nudge

### Stage 2: Smart insights (6-12 months)
LLM-powered analysis on top of structured data.
- "Your tenant Priya has paid on time 11/12 months — reliability score: 94"
- "3 of your properties have recurring AC repairs — might be a vendor problem"
- "Deposit deduction disputed — AI mediation with photo evidence"

### Stage 3: Autonomous transactions (12-24 months)
Agents that can execute, not just recommend.
- Auto-renew lease at market rate (landlord approves/rejects in one tap)
- UPI AutoPay mandate setup — rent collected without tenant action
- Automated deposit refund with deduction breakdown and photo proof

### Stage 4: Platform network (24-48 months)
The Reliability Score becomes a product.
- Tenants share their score when applying for new rentals
- Landlords subscribe to score lookups
- Becomes India's rental credit graph

---

## 4. Competitive Advantages to Build Now

| Advantage | What it requires | Timeline |
|---|---|---|
| Event-sourced data | Migration 012 (this week) | Week 1 |
| WhatsApp agent | Edge Function + Twilio (already deployed) | Week 1-2 |
| Photo AI analysis | GPT-4V integration on proof upload | Week 2-3 |
| Reliability Score v1 | Aggregation query on event log | Month 2 |
| Legal agreement AI | GPT-4 + jurisdiction templates | Month 3-4 |

---

## 5. Agent Architecture

Every AI feature follows this pattern:

```
Trigger (DB event / schedule / user action)
  → Agent Run (logged to agent_runs)
    → Decision (logged to agent_approvals if human approval needed)
      → Execution (logged to rental_events)
        → Audit Trail (permanent, immutable)
```

### Agent types planned

| Agent | Trigger | Human approval? | Execution |
|---|---|---|---|
| `rent-reminder` | payment overdue by N days | No | Send WhatsApp |
| `proof-analyzer` | proof photo uploaded | No | Write AI report |
| `dispute-mediator` | deposit dispute raised | Yes | Draft resolution |
| `lease-renewer` | lease expiry - 60 days | Yes | Propose new terms |
| `repair-escalator` | repair unresponded > 72h | No | Notify landlord |
| `reliability-scorer` | monthly cron | No | Update score |

---

## 6. Concrete Features — Priority Order

### Priority 1 (build this week)
**Event sourcing foundation** — migration 012. Every feature below depends on this.

### Priority 2 (build next 2 weeks)
**WhatsApp rent reminder agent** — highest ROI, zero LLM cost, directly reduces landlord's #1 pain.
- Trigger: `rent_payments` row with `status = 'overdue'` AND `agent_runs` has no active run for this payment
- Action: call `send-whatsapp` Edge Function with templated message
- Backoff: day 1, day 3, day 7, then stop and flag for manual action

### Priority 3 (month 1)
**Photo condition AI** — GPT-4V on proof upload, generates structured condition report per room.
- On `proof_photos` insert → trigger Edge Function → call GPT-4V → write `condition_report` JSONB to photo record
- Report: `{ condition: 'good'|'fair'|'poor', observations: string[], confidence: 0-1 }`
- Landlord sees AI summary alongside photos in proof review screen

### Priority 4 (month 2)
**Tenant Reliability Score v1** — pure SQL aggregation, no LLM.
- Formula: payment_timeliness (50%) + dispute_rate (20%) + repair_cooperation (15%) + lease_adherence (15%)
- Stored in `profiles.reliability_score` (numeric 0-100)
- Updated monthly by cron agent

### Priority 5 (month 3)
**AI lease draft** — GPT-4 with jurisdiction-specific template + property/tenant context.
- Landlord taps "Generate Agreement" → agent run created → draft returned in 30s
- Landlord reviews, edits, approves → tenant signs via e-sign

---

## 7. Direct Execution Plan

### This Week
- [x] Event sourcing migration (012) — tables + indexes + RLS
- [ ] Instrument existing mutations (pay-rent, proof upload, repair create) to write events
- [ ] WhatsApp reminder agent Edge Function (cron-triggered, reads overdue payments)
- [ ] Set Twilio + Razorpay secrets in Supabase

### Next 2 Weeks
- [ ] Photo AI Edge Function (`analyze-proof-photo` → GPT-4V)
- [ ] `agent_runs` dashboard in landlord UI (so landlord can see what AI is doing)
- [ ] Reliability Score v1 aggregation query

### Month 2
- [ ] Dispute mediation flow (landlord/tenant both see AI reasoning, can accept/counter)
- [ ] Reliability Score displayed on landlord's tenant view
- [ ] Tenant can share score link

### Month 3
- [ ] AI lease draft generation
- [ ] UPI AutoPay mandate exploration (NPCI API research)

---

## 8. Market Positioning

**Not** "AI-powered rental app." That's noise.

**Position as:** "The first rental platform in India where the property manages itself."

Specific claims that are defensible:
- "Rent gets collected. You get notified." (UPI AutoPay)
- "Disputes resolved with photo evidence, not arguments." (AI mediation)
- "Your tenant's reliability score — before you hand over the keys." (Trust graph)

The emotional sell for landlords: *you shouldn't have to chase rent*. Every feature reinforces this.
The emotional sell for tenants: *your good payment history should mean something*. Reliability score.

---

## 9. Brutal Reality Check

**What could kill this:**

1. **NPCI regulation** — UPI AutoPay for rent is technically possible but requires RBI authorization as a payment aggregator. This is a 12-18 month compliance process. Plan B: partner with Razorpay's recurring billing product.

2. **GPT-4V cost** — At ₹30/photo analysis, 10,000 proof photos/month = ₹3 lakhs/month. Must add caching, downgrade to cheaper model for routine checks, use GPT-4V only for disputed photos.

3. **WhatsApp Business API rate limits** — Twilio WhatsApp has 1,000 conversations/day on free tier. Must migrate to direct Meta API (Business Solution Provider) before reaching scale.

4. **Data quality** — The Reliability Score is only as good as the events we record. If landlords don't report bad tenants (because they don't bother), the score is biased toward good. Need incentive design.

5. **Distribution** — Building a moat means nothing if landlords don't know we exist. The AI features are the growth loop: a landlord tells another landlord "my tenant paid automatically and I got a WhatsApp when it landed." That's the viral moment we need to engineer.

---

## 10. 10-Year Roadmap

| Year | Milestone |
|---|---|
| 2026 | Event store live, WhatsApp agent running, 500 active rentals |
| 2027 | Reliability Score v1 launched, 5,000 rentals, Series A discussion |
| 2028 | AI lease draft, UPI AutoPay pilot, 25,000 rentals |
| 2029 | Reliability Score API (landlords in other platforms query it), 100,000 rentals |
| 2030 | Rental credit graph licensed to banks (home loan underwriting for tenants) |
| 2032 | Expand to SEA rental markets (similar fragmentation, WhatsApp penetration) |
| 2034 | IPO or strategic acquisition at rental credit graph valuation |

**The 10-year thesis:** India has 100M rental households. Zero have portable rental history. The company that creates the rental credit graph owns the largest underwriting dataset in Indian housing. That's a financial infrastructure company, not a proptech app.

---

## Execution Principle

> Ship the infrastructure first. Features are bets. Infrastructure is compounding.

The event store is not a feature. It's the substrate that makes every feature better retroactively. Build it before you build anything else AI-related. Every day without it means every rent payment, every photo, every repair request is data that can never be recovered with full context.
