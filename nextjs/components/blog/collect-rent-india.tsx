import { Callout, CardGrid, MiniCard, ChecklistBox, InlineCTA } from '@/components/article-shell'

export function CollectRentIndiaArticle() {
  return (
    <>
      <p>
        Collecting rent sounds simple. In practice, it involves choosing a payment method, tracking payments,
        handling late payers, issuing receipts that satisfy the Income Tax department, and maintaining records
        for years. Done badly, it creates monthly stress and annual tax headaches. Done right, it&apos;s nearly automatic.
      </p>
      <p>
        This guide covers everything an Indian landlord needs to know about rent collection in 2025 — from payment
        methods to legal requirements to tools that take the manual work out of it.
      </p>

      <h2>Choosing the right payment method</h2>
      <p>
        The choice of payment method affects your audit trail, the ease of tracking, and your tenant&apos;s convenience.
        Here&apos;s how the main options compare:
      </p>

      <CardGrid>
        <MiniCard title="UPI" badge="Recommended">
          Instant, free, works on any smartphone. Creates an automatic digital record. Best for monthly rent up to
          ₹1–2 lakh. G Pay, PhonePe, BHIM, and Paytm all work.
        </MiniCard>
        <MiniCard title="NEFT / IMPS">
          Bank-to-bank transfer. Better for large amounts. NEFT has a per-transaction fee at some banks. IMPS is
          instant. Both create clear bank records with a transaction reference.
        </MiniCard>
        <MiniCard title="Cheque">
          Increasingly outdated. Processing delay of 1–3 days. Bounce risk. No real advantage over UPI. Only useful
          if your tenant doesn&apos;t have a smartphone.
        </MiniCard>
        <MiniCard title="Cash">
          Legal but problematic. No paper trail unless you issue receipts. Cash transactions above ₹20,000 are
          restricted under IT rules. Avoid for rents above ₹10,000.
        </MiniCard>
      </CardGrid>

      <p>
        <strong>Recommendation for most Indian landlords:</strong> use UPI as the primary method. It&apos;s instant, free,
        creates an automatic record, and both you and your tenant get a payment confirmation. If your tenant prefers
        cash, still issue a formal receipt every month and keep a separate ledger.
      </p>

      <h2>What payment proof to keep</h2>
      <p>For tax purposes and dispute prevention, keep the following for every rental payment:</p>
      <ul>
        <li><strong>UPI transaction ID / UTR number</strong> — the unique identifier for every digital payment. Keep it on the receipt.</li>
        <li><strong>Screenshot of payment confirmation</strong> — both you and your tenant should save this.</li>
        <li><strong>Bank statement</strong> — download and archive monthly. Helps if a payment dispute arises two years later.</li>
        <li><strong>Signed rent receipt</strong> — issue one for each month. You&apos;ll need these if you&apos;re audited on rental income.</li>
      </ul>

      <Callout tone="tip" title="A note on rental income tax">
        Rental income above ₹2.5 lakh/year (combined with other income) is taxable. You can deduct a 30% standard
        deduction for repairs and maintenance, plus property tax paid. If you manage multiple properties, proper
        record-keeping of income and deductions significantly reduces your tax liability. Keep all receipts and bank
        records for at least 7 years.
      </Callout>

      <h2>Setting up the right due date</h2>
      <p>
        Choose a rent due date between the 1st and 28th of the month — avoid the 29th, 30th, or 31st because not all
        months have those dates. The 1st or 5th of the month is most common in India.
      </p>
      <p>
        Specify the due date clearly in the rental agreement. Include a grace period (typically 3–5 days) and the late
        payment fee, if any. Clarity upfront prevents awkward conversations later.
      </p>

      <h2>Issuing rent receipts: what&apos;s required</h2>
      <p>
        This is the section most landlords get wrong — and it creates problems for their tenants, and indirectly for them.
      </p>

      <h3>When receipts become mandatory</h3>
      <p>
        Technically, tenants are entitled to a receipt for every payment. Practically, the critical threshold is{' '}
        <strong>₹1 lakh in annual rent</strong> (about ₹8,333/month). Above this, tenant HRA claims require the
        landlord&apos;s PAN on the receipt. If you refuse to provide PAN-included receipts, your tenant cannot claim their
        full HRA exemption — which damages the rental relationship and may lead them to find a more cooperative landlord.
      </p>

      <h3>What a valid HRA receipt must include</h3>
      <ul>
        <li>Tenant&apos;s full name</li>
        <li>Landlord&apos;s full name</li>
        <li>Landlord&apos;s PAN (mandatory if annual rent exceeds ₹1 lakh)</li>
        <li>Complete property address including pin code</li>
        <li>Month and year the receipt covers</li>
        <li>Rent amount in figures and in words</li>
        <li>Date of payment</li>
        <li>Payment method (UPI / NEFT / cash) and transaction reference</li>
        <li>Landlord&apos;s signature</li>
      </ul>
      <p>
        Use the <a href="/tools/hra-receipt-generator">free HRA rent receipt generator</a> to create properly formatted receipts, or use the
        RentyBase app where receipts are generated automatically every month once rent is marked paid.
      </p>

      <h2>Handling late payments without damaging the relationship</h2>
      <p>
        Late rent is the number one landlord-tenant conflict. How you handle it determines whether your tenancy remains
        smooth for the next two years or becomes adversarial.
      </p>

      <h3>Prevention: the best approach</h3>
      <ul>
        <li>Set up automatic reminders 3 days before the due date (RentyBase does this automatically)</li>
        <li>Remind tenants in a neutral, non-judgmental way — &ldquo;Just a reminder that rent is due on the 1st&rdquo;</li>
        <li>Make payment easy — share your UPI QR code or bank details somewhere they can always access</li>
      </ul>

      <h3>When rent is 1–5 days late</h3>
      <p>
        Send a polite reminder. Most late payments in India are genuine forgetfulness, not financial trouble. A
        WhatsApp message in a neutral tone (&ldquo;Hi, rent for June hasn&apos;t come through yet — please do transfer at your
        convenience&rdquo;) usually resolves it within 24 hours.
      </p>

      <h3>When rent is 10+ days late</h3>
      <p>
        Send a more formal reminder. Ask if there&apos;s a reason — sometimes tenants are genuinely going through financial
        difficulty, and an honest conversation leads to a payment plan that works for both parties. A tenant who pays
        on a 3-month arrangement is better than a 6-month eviction process.
      </p>

      <h3>When rent is consistently late (3+ months)</h3>
      <p>
        Issue a formal legal notice under the applicable state rent control act. This creates a paper trail and signals
        seriousness. In most states, consistent non-payment after notice is grounds for eviction proceedings.
      </p>

      <Callout tone="warn" title="Don't threaten to cut utilities">
        Cutting off electricity or water to force payment is illegal under most state rent control acts and can result
        in criminal complaints against you as a landlord. Use legal notice → rent tribunal → eviction proceedings — not
        self-help remedies.
      </Callout>

      <h2>Maintaining a rent register (even if it&apos;s digital)</h2>
      <p>
        Keep a record for each property with: tenant name, monthly rent amount, due date, payment received date,
        payment method, transaction reference, and receipt issued. This is your rental income record for tax purposes
        and your evidence in any dispute.
      </p>
      <p>
        Excel works if you&apos;re disciplined. A dedicated app like RentyBase is better — it maintains this record
        automatically as payments are logged.
      </p>

      <h2>How RentyBase automates rent collection</h2>
      <p>
        If you&apos;re managing two or more properties, manual tracking becomes unsustainable. RentyBase is designed to
        handle the repetitive parts of rent collection so you don&apos;t have to:
      </p>

      <ChecklistBox
        title="What RentyBase does automatically"
        items={[
          'Sends rent reminders to tenants before and on the due date',
          'Escalates to overdue after 3 days with automatic follow-up notifications',
          "Stores the tenant's payment proof (screenshot / UTR) with each payment",
          'Generates HRA-compliant receipts the moment you mark rent as paid',
          'Stores all 12 months of receipts — the tenant downloads them independently',
          'Shows all your properties on one dashboard with real-time payment status',
        ]}
      />

      <p>
        Setup takes about 5 minutes per property. You create the rental, add your bank details and PAN, and share an
        invite link with your tenant. From there the collection process runs itself — you only need to mark payments
        as confirmed once the money arrives.
      </p>
      <p>It&apos;s free for both landlords and tenants. No monthly subscription.</p>

      <InlineCTA
        heading="Set up automatic rent collection"
        body="Free for landlords. Set up in 5 minutes. Receipts, reminders, and payment tracking — all handled."
        href="/signup"
        label="Create your first rental"
      />
    </>
  )
}
