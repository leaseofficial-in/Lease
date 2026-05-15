import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'

export const metadata: Metadata = {
  title: 'Terms of Service — RentyBase',
  description: 'Terms of Service for RentyBase — the rental management platform for Indian landlords and tenants. Last updated May 2025.',
  alternates: { canonical: 'https://rentybase.com/terms' },
}

const sections = [
  {
    title: '1. Acceptance of terms',
    body: `By creating an account or using RentyBase ("Service", "Platform"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use RentyBase.

These Terms form a binding agreement between you and RentyBase. "You" refers to any individual using the Service — whether as a landlord, tenant, or visitor.`,
  },
  {
    title: '2. What RentyBase does',
    body: `RentyBase is a rental management platform that provides:
- A shared payment ledger for landlords and tenants
- Automated HRA rent receipt generation (Section 10(13A))
- Move-in and move-out photo proof storage
- Security deposit tracking
- Repair request management
- Rental agreement storage

RentyBase is a record-keeping and coordination tool. It is not a payment processor, a legal service, a real estate agent, or a party to any rental agreement between a landlord and tenant.`,
  },
  {
    title: '3. Eligibility',
    body: `You must be at least 18 years old to use RentyBase. By using the Service, you represent that you are 18 or older and have the legal capacity to enter into a binding agreement.

RentyBase is currently available to users in India only.`,
  },
  {
    title: '4. Your account',
    body: `You sign in using Google OAuth. You are responsible for all activity that occurs under your account.

You must provide accurate information — particularly your full name and PAN number, which are used in HRA rent receipts. Providing false information for the purpose of generating fraudulent tax documents is a violation of these Terms and may be a criminal offence under Indian law.

You must not share your account with others or allow others to access your account.`,
  },
  {
    title: '5. Acceptable use',
    body: `You agree not to:
- Use RentyBase to generate fraudulent rent receipts or misrepresent rental transactions
- Upload content that is illegal, defamatory, or violates any third party's rights
- Attempt to reverse-engineer, scrape, or otherwise access the Service other than through normal use
- Use the Service in any way that could damage, disable, or impair RentyBase's infrastructure
- Impersonate another person or provide false information about any rental relationship

RentyBase may suspend or terminate accounts that violate these rules.`,
  },
  {
    title: '6. Shared rental records',
    body: `RentyBase is built on the principle that both parties in a rental — landlord and tenant — have equal access to the shared rental record. By joining a rental on RentyBase (whether as landlord or tenant), you consent to the other party being able to see:

- All logged payments in that rental
- Deposit transactions and balances
- Move-in and move-out photos you upload
- Repair requests you raise or respond to

This shared access is a core function of the product, not a privacy risk. You control your participation — you can leave a rental at any time.`,
  },
  {
    title: '7. Payments and Razorpay',
    body: `Rent payments processed through RentyBase use Razorpay as the payment gateway. By initiating a payment, you also agree to Razorpay's Terms of Service and Privacy Policy.

RentyBase records payment metadata (amount, date, UTR number, method) but does not store card numbers or bank account credentials. These are handled entirely by Razorpay.

RentyBase charges no fee for any transaction. The amount you pay is the rent amount set in your rental — no platform fee is added.`,
  },
  {
    title: '8. HRA receipts and tax documents',
    body: `RentyBase generates HRA rent receipts based on information you and your landlord provide. These receipts are designed to comply with the requirements of Section 10(13A) of the Income Tax Act, 1961.

However, RentyBase does not provide tax advice. You are responsible for verifying that your receipts meet the requirements of your employer's or the Income Tax Department's current standards. We recommend consulting a tax professional for advice specific to your situation.

If your landlord's PAN is incorrect or missing, receipts may not be valid for HRA exemption claims above ₹1 lakh annually.`,
  },
  {
    title: '9. Move-in proof and photos',
    body: `Photos uploaded to RentyBase as move-in or move-out proof are timestamped and stored with metadata. RentyBase does not alter uploaded photos and does not allow either party to modify or delete them after upload.

RentyBase is not a party to any dispute arising from the condition of a property. Photo records are made available to both parties as evidence, but any legal dispute must be resolved between the landlord and tenant directly or through appropriate legal channels.`,
  },
  {
    title: '10. Intellectual property',
    body: `All content, design, and code in RentyBase (excluding user-uploaded content) is owned by RentyBase and protected by applicable intellectual property laws.

You retain ownership of any content you upload (photos, documents). By uploading content, you grant RentyBase a limited, non-exclusive licence to store, display, and share that content with the parties in your rental as required to provide the Service.`,
  },
  {
    title: '11. Disclaimer of warranties',
    body: `RentyBase is provided "as is" without warranty of any kind. We do not warrant that the Service will be error-free, uninterrupted, or available at all times.

We make no representation that HRA receipts generated by RentyBase will be accepted by any particular employer or the Income Tax Department. Tax laws may change; it is your responsibility to verify compliance.`,
  },
  {
    title: '12. Limitation of liability',
    body: `To the maximum extent permitted by applicable law, RentyBase will not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the Service.

RentyBase's total liability to you for any claim arising from these Terms or the Service will not exceed the amount you have paid to RentyBase in the 12 months preceding the claim. Since RentyBase is free, this limit is ₹0 — reflecting the fact that you are not paying for the Service.`,
  },
  {
    title: '13. Termination',
    body: `You may delete your account at any time. We may suspend or terminate your access if you violate these Terms.

Upon termination, your personal profile data will be deleted within 30 days. Rental records shared with another party will be anonymised to preserve their records.`,
  },
  {
    title: '14. Changes to these terms',
    body: `We may update these Terms from time to time. We will notify you of significant changes via the app or email at least 14 days before they take effect. Continued use after the effective date constitutes acceptance.`,
  },
  {
    title: '15. Governing law and disputes',
    body: `These Terms are governed by the laws of India. Any dispute arising from these Terms or your use of RentyBase will be subject to the exclusive jurisdiction of courts in India.

Before initiating any legal proceeding, we encourage you to contact us at hello@rentybase.com — most issues can be resolved quickly.`,
  },
  {
    title: '16. Contact',
    body: `Questions about these Terms:

Email: hello@rentybase.com`,
  },
]

export default function TermsPage() {
  return (
    <div className="lp-page">
      <MarketingNav />

      {/* Header */}
      <section style={{ paddingTop: 120, paddingBottom: 56, background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>LEGAL</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(32px,5vw,50px)', fontWeight: 400, lineHeight: 1.06, letterSpacing: '-.03em', marginBottom: 16 }}>
            Terms of Service
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
            These terms govern your use of RentyBase. We have written them to be clear and fair. If anything is unclear, email us at hello@rentybase.com and we will explain it.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {sections.map(s => (
              <div key={s.title}>
                <h2 style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--rb-ink)' }}>{s.title}</h2>
                <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--rb-ink-2)' }}>
                  {s.body.split('\n').map((line, i) => {
                    if (line.startsWith('- ')) {
                      return (
                        <p key={i} style={{ marginBottom: 8 }}>
                          <span style={{ marginRight: 8, color: 'var(--rb-action)' }}>·</span>
                          {line.replace(/^- /, '')}
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
