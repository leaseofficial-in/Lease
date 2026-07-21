import { Callout, CompareColumns, CompareColumn, InlineCTA } from '@/components/article-shell'

export function SecurityDepositWearAndTearArticle() {
  return (
    <>
      <p>
        You&apos;ve been a good tenant. Paid rent on time for two years. Never had a major dispute. Now you&apos;re moving out,
        and your landlord is holding ₹40,000 of your deposit &ldquo;for repairs&rdquo; — including repainting a wall that was
        already discoloured when you moved in and replacing tiles that were cracked before you signed the agreement.
      </p>
      <p>This happens every day across India. And most tenants don&apos;t know they have rights, or how to exercise them.</p>

      <Callout tone="tip" title="The core principle">
        In India, as in most countries, a landlord <strong>cannot</strong> deduct security deposit for normal wear and
        tear resulting from ordinary use. They <strong>can</strong> deduct for actual damage you caused beyond what&apos;s
        expected from everyday living. The challenge is proving what was pre-existing.
      </Callout>

      <h2>What is &ldquo;normal wear and tear&rdquo;?</h2>
      <p>
        Normal wear and tear refers to the gradual deterioration of a property from everyday use — things that happen
        naturally over time regardless of how careful a tenant is. It&apos;s the opposite of negligence or deliberate damage.
      </p>

      <CompareColumns>
        <CompareColumn
          tone="good"
          heading="Normal wear and tear (not chargeable)"
          items={[
            'Faded or chalky paint after 2+ years',
            'Minor scuffs or marks on walls from furniture',
            'Small nail holes from hanging pictures',
            'Worn or faded carpet from walking on it',
            'Loose door or window hinges from normal use',
            'Worn finish on wooden floors',
            'Yellowing of grout over time',
            'Faded or worn curtains and blinds',
            'Minor scratches on hard floor surfaces',
          ]}
        />
        <CompareColumn
          tone="bad"
          heading="Actual damage (chargeable)"
          items={[
            'Holes in walls beyond small nail holes',
            'Burns on carpet, countertops, or floors',
            'Broken tiles, fixtures, or glass',
            'Stains that cannot be removed with normal cleaning',
            'Broken doors, windows, or locks',
            'Pet damage (scratches, odour, stains)',
            'Mould caused by tenant negligence, e.g. blocking ventilation',
            'Missing or broken appliances and fittings',
            'Damage from modifications made without permission',
          ]}
        />
      </CompareColumns>

      <h2>What Indian law says</h2>
      <p>
        India doesn&apos;t have a single central law governing security deposits and wear and tear — it&apos;s governed by a
        combination of state rent control acts, the Transfer of Property Act, and the terms of your rental agreement.
      </p>

      <h3>State rent control acts</h3>
      <p>
        Most major states — Maharashtra (Maharashtra Rent Control Act 1999), Karnataka (Karnataka Rent Act 2001), Tamil
        Nadu (Tamil Nadu Buildings (Lease and Rent Control) Act), Delhi (Delhi Rent Control Act) — recognise the
        distinction between wear and tear and actual damage. The general principle across these acts: tenants are
        responsible for damage they cause, not for the natural deterioration of the property.
      </p>

      <h3>The Model Tenancy Act, 2021</h3>
      <p>
        The central government&apos;s Model Tenancy Act 2021, which states are encouraged to adopt, specifically addresses
        deposits. Under this act:
      </p>
      <ul>
        <li>Security deposit for residential property is capped at two months&apos; rent</li>
        <li>The landlord must return the deposit within one month of vacating, minus legitimate deductions</li>
        <li>Deductions must be for actual losses and damage beyond normal wear and tear</li>
        <li>The tenant can approach a Rent Authority for disputes</li>
      </ul>
      <p>
        As of 2025, Maharashtra, Uttar Pradesh, Andhra Pradesh, and a few other states have adopted versions of this
        act. Karnataka, Tamil Nadu, and others still operate under older acts.
      </p>

      <Callout tone="warn" title="The enforcement gap">
        The law may be on your side, but enforcement requires filing a complaint with a Rent Authority or small claims
        court. That takes time and effort many tenants don&apos;t pursue, which is why landlords get away with wrongful
        deductions. The practical solution is to prevent the dispute with documentation — not to fight it in court.
      </Callout>

      <h2>How to protect your security deposit before you move out</h2>

      <h3>1. Take move-in photos (the most important step)</h3>
      <p>
        On the day you move in — before you put any furniture or belongings inside — photograph every single room. Cover:
      </p>
      <ul>
        <li>Every wall, ceiling, and floor</li>
        <li>Kitchen: countertops, tiles, inside cabinets, appliances</li>
        <li>Bathrooms: tiles, fixtures, toilet, shower</li>
        <li>All doors, windows, locks, and hinges</li>
        <li>Balconies and exterior-facing surfaces</li>
      </ul>
      <p>
        Make sure photos are timestamped — most smartphones timestamp automatically in the EXIF data. The timestamp
        proves the photos were taken on move-in day, not fabricated later. Send them to your landlord via WhatsApp or
        email immediately; this creates a shared record.
      </p>
      <p>
        Even better: use <a href="/signup">RentyBase</a> to upload move-in photos room by room. They&apos;re stored in the
        rental record, visible to both you and your landlord, and timestamped. Neither party can alter them after upload.
      </p>

      <h3>2. Document pre-existing damage in writing</h3>
      <p>
        If you notice any damage on move-in day — a crack in the bathroom tile, a stain on the wall, a broken window
        latch — write it down and get the landlord to acknowledge it in writing. A WhatsApp message works; email is
        better. This prevents them claiming it was your damage at move-out.
      </p>

      <h3>3. Get a move-out inspection done together</h3>
      <p>
        When you&apos;re vacating, do a walkthrough of the property together with your landlord. Ask for a written
        inspection report. If they identify damage, get them to specify each item and the estimated cost. Don&apos;t agree
        to a blanket deduction — insist on itemised billing.
      </p>

      <h3>4. Keep all rent receipts</h3>
      <p>
        A landlord who wants to dispute your deposit sometimes claims unpaid rent as a reason to withhold funds. Keep
        every receipt for rent paid. On RentyBase, all payment records are stored permanently and both parties can see them.
      </p>

      <h2>What to do if your landlord wrongfully withholds your deposit</h2>
      <p>
        If your landlord withholds your deposit without justification, or deducts for normal wear and tear, you have
        these options:
      </p>
      <ol>
        <li>
          <strong>Send a legal notice.</strong> A formal legal notice, drafted by a lawyer and sent by registered post,
          often resolves the dispute — landlords realise you&apos;re serious and that a court battle isn&apos;t worth ₹15,000 in
          deductions. Legal notice fees are typically ₹1,000–₹3,000.
        </li>
        <li>
          <strong>File with a Rent Authority.</strong> Under the Model Tenancy Act, in states that have adopted it, you
          can file a complaint with the Rent Authority. The process is faster and cheaper than civil court.
        </li>
        <li>
          <strong>File in consumer court.</strong> Security deposit disputes can be brought to the District Consumer
          Disputes Redressal Forum as a service deficiency. This is especially effective when the landlord is a builder
          or large property company.
        </li>
        <li>
          <strong>Small claims / civil court.</strong> For deposits above ₹50,000, civil court may be necessary.
          Time-consuming, but winnable with good documentation.
        </li>
      </ol>

      <Callout tone="success" title="Your strongest evidence">
        Timestamped move-in photos, written acknowledgment of pre-existing damage, and all rent-paid receipts. With
        these three things, a landlord attempting a wrongful deduction faces an uphill battle in any forum.
      </Callout>

      <h2>Deposit deductions: a landlord checklist</h2>
      <p><em>(For landlords reading this: here&apos;s what you can legitimately deduct.)</em></p>
      <ul>
        <li>Damage beyond normal wear and tear, with before/after photos</li>
        <li>Professional cleaning if the tenant left the property in unacceptable condition</li>
        <li>Unpaid rent or utility bills, with documentation</li>
        <li>Costs to repair or replace items specifically damaged by the tenant</li>
        <li>Penalties specified in the rental agreement that the tenant violated</li>
      </ul>
      <p>
        What you <strong>cannot</strong> deduct: normal painting between tenancies, cleaning of naturally accumulated
        dust and grime, replacement of ageing fixtures or appliances that have reached end of life, or repairs for
        damage that pre-existed the tenancy.
      </p>

      <h2>How RentyBase makes deposit disputes rare</h2>
      <p>RentyBase was built specifically to handle these disputes before they happen:</p>
      <ul>
        <li>Tenants upload move-in photos room by room — stored in the rental record</li>
        <li>Landlords can log deductions at any point during the tenancy, with reason and photo evidence</li>
        <li>Both parties see the deposit ledger in real time — transparency prevents surprise deductions at move-out</li>
        <li>All payment records are stored, so there&apos;s no dispute over unpaid rent</li>
      </ul>
      <p>
        When both landlord and tenant know that every action is documented and visible to the other, behaviour changes.
        Disputes become rare because both parties are accountable from day one.
      </p>

      <InlineCTA
        heading="Protect your deposit before you move in"
        body="Upload move-in photos on RentyBase. Timestamped, stored permanently, visible to both landlord and tenant."
        href="/signup"
        label="Get started free"
      />
    </>
  )
}
