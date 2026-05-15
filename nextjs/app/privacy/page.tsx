import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'

export const metadata: Metadata = {
  title: 'Privacy Policy — RentyBase',
  description: 'How RentyBase collects, uses, and protects your personal information. Last updated May 2025.',
  alternates: { canonical: 'https://rentybase.com/privacy' },
}

const sections = [
  {
    title: '1. Who we are',
    body: `RentyBase ("we", "us", "our") is a rental management platform built for Indian landlords and tenants. We operate the website rentybase.com and the RentyBase mobile application.

Contact: hello@rentybase.com`,
  },
  {
    title: '2. Information we collect',
    body: `**Account information:** When you sign in with Google, we receive your name, email address, and profile photo from Google OAuth. We do not receive or store your Google password.

**Profile information you provide:** Full name, phone number, PAN number (required for HRA receipt generation if annual rent exceeds ₹1 lakh), UPI ID, and profile photo.

**Rental data:** Property addresses, rent amounts, payment dates, UTR/reference numbers, payment method, and notes you enter when logging payments.

**Photos:** Room photos you upload as move-in or move-out proof, repair photos attached to repair requests.

**Device information:** Push notification token (if you grant permission), device type, and browser/app version for support purposes.

**Usage data:** Pages visited, features used, and error logs — collected in aggregate to improve the product.`,
  },
  {
    title: '3. How we use your information',
    body: `- **Provide the service:** Generate HRA rent receipts, maintain payment ledgers, store move-in/move-out proof, and connect landlords with tenants.
- **HRA receipt generation:** Your name, landlord's PAN, rent amount, rental period, and property address are used to generate Section 10(13A)-compliant receipts.
- **Notifications:** Push notifications (via Expo) and WhatsApp messages (via Twilio) for rent reminders and rental activity — only if you have granted permission.
- **Support:** We may use your email to respond to questions or send important service updates.
- **Security:** To detect fraud, prevent abuse, and protect user data.

We do not sell your personal information to third parties. We do not use your data for advertising.`,
  },
  {
    title: '4. Who we share data with',
    body: `**Supabase:** Our database and authentication provider. Your data is stored in Supabase's managed Postgres infrastructure (hosted on AWS, region: ap-south-1). Supabase processes data under appropriate data processing agreements.

**Google:** Used for authentication only. We receive basic profile information at sign-in; we do not send your rental data to Google.

**Razorpay:** Payment processing for rent collection. When you initiate a payment, a Razorpay order is created. Razorpay may collect payment method and transaction data per their own privacy policy.

**Twilio:** Used to send WhatsApp notifications for rent reminders. Phone numbers are shared with Twilio only when sending a notification.

**Your co-party in a rental:** Landlords and tenants in the same rental can see the shared ledger — payments, deposit transactions, move-in photos, and repair requests — by design. This shared access is the core function of the product.`,
  },
  {
    title: '5. Data retention',
    body: `We retain your account data for as long as your account is active. Rental records (payments, receipts, photos) are retained for the lifetime of the rental plus 7 years, consistent with Indian income tax documentation requirements.

Move-in and move-out photos are retained permanently by default, as they serve as legal proof of property condition. You may request deletion (see Section 7).

If you delete your account, your personal profile information is deleted within 30 days. Rental records in which another party (landlord or tenant) also participated will be anonymised rather than deleted, to preserve the other party's records.`,
  },
  {
    title: '6. Data security',
    body: `All data is transmitted over TLS (HTTPS). Photos are stored in Supabase Storage with access controls. Database access is restricted by row-level security (RLS) policies — each user can only read records they are a party to.

PAN numbers are stored encrypted at rest. Push tokens are stored only to deliver notifications and are rotated on each app session.

No system is perfectly secure. If you become aware of any security issue, please contact us immediately at hello@rentybase.com.`,
  },
  {
    title: '7. Your rights',
    body: `You have the right to:

- **Access** the personal data we hold about you.
- **Correct** inaccurate data via your profile settings.
- **Delete** your account and associated personal data.
- **Export** your rental data (payment history, receipts) — contact us and we will provide a data export within 14 days.
- **Withdraw consent** for notifications at any time in device or app settings.

To exercise any right, email hello@rentybase.com from the address associated with your account. We will respond within 14 days.`,
  },
  {
    title: '8. Children',
    body: `RentyBase is not intended for users under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us at hello@rentybase.com and we will delete it promptly.`,
  },
  {
    title: '9. Changes to this policy',
    body: `We may update this Privacy Policy from time to time. When we make significant changes, we will notify users via the app and update the "Last updated" date at the top of this page. Continued use of RentyBase after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '10. Governing law',
    body: `This Privacy Policy is governed by the laws of India, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 (DPDPA). Any disputes arising from this policy shall be subject to the jurisdiction of courts in India.`,
  },
  {
    title: '11. Contact',
    body: `For privacy questions, data requests, or to report a concern:

Email: hello@rentybase.com
Response time: within 14 business days`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="lp-page">
      <MarketingNav />

      {/* Header */}
      <section style={{ paddingTop: 120, paddingBottom: 56, background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>LEGAL</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(32px,5vw,50px)', fontWeight: 400, lineHeight: 1.06, letterSpacing: '-.03em', marginBottom: 16 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', lineHeight: 1.6 }}>
            Last updated: May 2025 · Effective: May 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: '64px 0 96px', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--rb-ink-2)', marginBottom: 48, padding: '20px 24px', background: 'var(--rb-action-soft)', borderRadius: 12, borderLeft: '3px solid var(--rb-action)' }}>
            This policy explains what personal information RentyBase collects, why we collect it, and how you can control it. We have written it to be readable — not just legally defensible. If something is unclear, email us.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {sections.map(s => (
              <div key={s.title}>
                <h2 style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--rb-ink)' }}>{s.title}</h2>
                <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--rb-ink-2)', whiteSpace: 'pre-line' }}>
                  {s.body.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={i} style={{ fontWeight: 600, color: 'var(--rb-ink)', marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</p>
                    }
                    if (line.startsWith('- ') || line.startsWith('**')) {
                      const bold = line.match(/\*\*(.*?)\*\*/)
                      const rest = line.replace(/\*\*(.*?)\*\*/, '').replace(/^- /, '')
                      return (
                        <p key={i} style={{ marginBottom: 8, paddingLeft: line.startsWith('- ') ? 0 : 0 }}>
                          {line.startsWith('- ') && <span style={{ marginRight: 8, color: 'var(--rb-action)' }}>·</span>}
                          {bold && <strong style={{ color: 'var(--rb-ink)' }}>{bold[1]}</strong>}
                          {rest}
                        </p>
                      )
                    }
                    if (line === '') return <br key={i} />
                    return <p key={i} style={{ marginBottom: 12 }}>{line}</p>
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
