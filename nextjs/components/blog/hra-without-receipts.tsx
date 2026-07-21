import { Callout, InlineCTA } from '@/components/article-shell'

export function HraWithoutReceiptsArticle() {
  return (
    <>
      <p>
        It&apos;s March. Your employer&apos;s HR team wants HRA declarations by the 15th. You&apos;ve been paying rent faithfully
        for 11 months. And your landlord — who agreed to sign receipts &ldquo;whenever needed&rdquo; — is now ignoring your calls.
      </p>
      <p>
        This situation affects millions of Indian salaried tenants every year. The good news: you have options. The bad
        news: some of those options carry risk. This guide walks through all of them honestly.
      </p>

      <Callout tone="tip" title="The short answer">
        If your landlord won&apos;t give receipts, your best bet is to (1) generate receipts yourself and get them signed,
        (2) use bank transfer proof as supplementary evidence, and (3) in future, switch to a platform like RentyBase
        where receipts are auto-generated and stored for both parties.
      </Callout>

      <h2>Why rent receipts matter for HRA</h2>
      <p>
        Under <strong>Section 10(13A) of the Income Tax Act 1961</strong>, salaried employees can claim an exemption on
        House Rent Allowance (HRA) if they actually pay rent and live in rented accommodation. The amount exempted is
        the minimum of:
      </p>
      <ul>
        <li>Actual HRA received from the employer</li>
        <li>50% of basic salary (metro cities) or 40% (non-metro)</li>
        <li>Actual rent paid minus 10% of basic salary</li>
      </ul>
      <p>
        To claim this exemption, your employer&apos;s HR department needs proof that you actually paid rent. For most
        employees, that means rent receipts. If annual rent exceeds ₹1 lakh (₹8,333/month), the landlord&apos;s PAN number
        must also be on the receipt.
      </p>

      <h2>What the law says about landlords and receipts</h2>
      <p>
        Many tenants assume landlords are legally required to issue receipts. The reality is more nuanced. Under the{' '}
        <strong>Transfer of Property Act</strong> and various state rent control acts, a tenant paying rent has the
        right to obtain a receipt acknowledging payment. Most state rent control acts — Maharashtra, Delhi, Karnataka,
        Tamil Nadu — explicitly require landlords to give written receipts on payment.
      </p>
      <p>
        However, enforcement is weak. There is no quick penalty mechanism for a landlord who simply refuses. Your
        remedy is typically a formal legal complaint — not useful when you need receipts by March 15th.
      </p>

      <Callout tone="warn" title="Why landlords refuse">
        Most landlords who refuse receipts are worried about income tax liability. Rent income is taxable, and receipts
        create a paper trail. This is their problem to solve, not yours. But understanding their concern helps you
        negotiate: assure them that PAN on a receipt doesn&apos;t automatically mean they&apos;ll be audited — it just lets you
        verify their identity as the law requires.
      </Callout>

      <h2>Option 1: Generate the receipt and ask for a signature</h2>
      <p>
        This is the most practical solution for the March rush. You generate a properly formatted rent receipt using
        our <a href="/tools">free receipt tools</a>, print it, and get your landlord to sign it. Landlords who refuse
        to &ldquo;issue&rdquo; receipts are often willing to sign a document you bring them — it feels less like creating
        paperwork and more like approving something you&apos;ve already done.
      </p>
      <p>Make sure the receipt includes:</p>
      <ul>
        <li>Your full name as tenant</li>
        <li>Landlord&apos;s full name and PAN (mandatory if annual rent exceeds ₹1 lakh)</li>
        <li>Complete property address including pin code</li>
        <li>Month and year</li>
        <li>Rent amount in figures and words</li>
        <li>Date of payment and payment method (UPI, NEFT, cash)</li>
        <li>UTR or transaction reference for digital payments</li>
      </ul>
      <p>Generate receipts for each month separately. Most HR departments accept 12 individual monthly receipts.</p>

      <h2>Option 2: Bank transfer statements as proof</h2>
      <p>
        If you&apos;ve been paying rent via UPI, NEFT, or bank transfer — and the description or recipient name clearly
        shows it&apos;s rent — your bank statements become supporting evidence. This works best when:
      </p>
      <ul>
        <li>The transfer amount matches the agreed rent exactly</li>
        <li>Payments are made on roughly the same date each month</li>
        <li>The recipient&apos;s name in the bank statement matches the landlord&apos;s name in your agreement</li>
      </ul>
      <p>
        Bank statements alone are rarely sufficient for HRA claims above ₹1 lakh annual rent — you still need PAN
        details somewhere. Pair them with Option 1 (signed receipt) or Option 3 (self-declaration).
      </p>

      <h2>Option 3: Self-declaration with supporting documents</h2>
      <p>Some employers accept a combination of:</p>
      <ul>
        <li>A self-declaration form (format usually provided by your employer&apos;s HR)</li>
        <li>Copy of the rental agreement</li>
        <li>Bank transfer records showing 12 months of payments</li>
        <li>Landlord&apos;s PAN (obtained separately, or already in the rental agreement)</li>
      </ul>
      <p>
        This is the riskiest option. If your income tax return is selected for scrutiny and you claimed HRA without
        proper receipts, the Income Tax Officer has discretion to disallow the exemption. The burden of proof is on you.
      </p>

      <Callout tone="danger" title="Do not do this">
        Creating fake rent receipts — forging a landlord signature, inventing a fake landlord — is tax fraud under
        Section 277 of the Income Tax Act. Penalties can include imprisonment of six months to seven years plus a fine.
        No HRA benefit is worth this risk.
      </Callout>

      <h2>Option 4: Switch to digital payment, then ask again</h2>
      <p>
        If all else fails and your landlord wants cash but still won&apos;t give receipts, switch tactics. Pay by UPI or
        bank transfer. Digital payment creates an automatic audit trail that proves you paid.
      </p>
      <p>
        Some landlords who prefer cash will agree to sign receipts once you switch to UPI, because UPI payments are
        already visible in the tax system and a receipt gives them no additional exposure.
      </p>

      <h2>The permanent solution: use RentyBase</h2>
      <p>
        The approaches above are workarounds for a broken process. The real fix is to bring your landlord onto a system
        where receipts are generated automatically every month — requiring zero effort from either party.
      </p>
      <p>On RentyBase, when rent is marked as paid:</p>
      <ul>
        <li>A receipt is generated instantly with all mandatory details</li>
        <li>The landlord&apos;s PAN is included automatically if annual rent exceeds ₹1 lakh</li>
        <li>Both parties get the receipt — the tenant can download it anytime without asking</li>
        <li>All 12 months of receipts are stored and downloadable in March without any chasing</li>
      </ul>
      <p>
        The pitch to your landlord: &ldquo;This app sends you automatic rent reminders, tracks payments, and generates
        receipts. You don&apos;t have to do anything manually — and it&apos;s free.&rdquo; Most landlords agree once they understand
        the value to them.
      </p>

      <h2>Summary: what to do right now</h2>
      <ol>
        <li><strong>Generate receipts</strong> using the <a href="/tools">free tools</a> for each month you paid rent this year.</li>
        <li><strong>Approach your landlord</strong> with pre-filled printed receipts and ask for a signature. Make it as easy as possible for them.</li>
        <li><strong>Gather bank statements</strong> showing all rent transfers as supporting evidence.</li>
        <li><strong>Include the landlord&apos;s PAN</strong> in the receipt — look for it in the original rental agreement or ask directly.</li>
        <li><strong>For next year</strong>, set up RentyBase so receipts are auto-generated and you never have this problem again.</li>
      </ol>

      <h3>My employer&apos;s HR rejected bank statements. What now?</h3>
      <p>
        Ask HR specifically what format they need. Many HR systems accept signed rent receipts and bank statements
        together. If they want receipts specifically, generate them and go back to your landlord for signatures.
      </p>

      <h3>What if my landlord doesn&apos;t have a PAN?</h3>
      <p>
        Your landlord is required to apply for a PAN if they have taxable income. You can submit a declaration from the
        landlord that they don&apos;t have a PAN, along with Form 60. However, this invites additional scrutiny. Push your
        landlord to get a PAN — the process takes about 10 days online.
      </p>

      <InlineCTA
        heading="Never chase a receipt again"
        body="RentyBase generates a Section 10(13A) compliant receipt the moment rent is marked paid — and stores all 12 months for you."
        href="/signup"
        label="Get started free"
      />
    </>
  )
}
