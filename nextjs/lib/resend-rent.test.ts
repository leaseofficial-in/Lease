import { describe, it, expect } from 'vitest'
import { rentDueSoonEmail, rentOverdueEmail, paymentAwaitingConfirmationEmail, paymentConfirmedEmail, proofSubmittedEmail } from './resend-rent'

// These templates are string-concatenated HTML that goes to real people's inboxes
// and cannot be corrected after it is read. The first live run of the reminder job
// delivered 23 messages to four real addresses, so the bar here is that nothing
// ships unrendered again.
//
// The multi-month cases are the regression guard for the fan-out incident: a tenant
// with several unpaid months must receive ONE email about the total, not one per
// month.

const base = {
  tenantName: 'Aarav',
  propertyName: '2BHK Bandra West',
  amount: '₹22,000',
  dueDate: '5 September 2026',
  landlordName: 'Priya Sharma',
}

describe('rentDueSoonEmail', () => {
  it('says "today" / "tomorrow" rather than "in 0 days"', () => {
    expect(rentDueSoonEmail({ ...base, daysUntilDue: 0 }).subject).toContain('due today')
    expect(rentDueSoonEmail({ ...base, daysUntilDue: 1 }).subject).toContain('due tomorrow')
    expect(rentDueSoonEmail({ ...base, daysUntilDue: 3 }).subject).toContain('in 3 days')
  })

  it('renders the amount exactly as given, without re-deriving currency', () => {
    const { html } = rentDueSoonEmail({ ...base, amount: '$1,750.00', daysUntilDue: 2 })
    expect(html).toContain('$1,750.00')
    expect(html).not.toContain('₹')
  })

  it('produces a complete document, not a fragment', () => {
    const { html } = rentDueSoonEmail({ ...base, daysUntilDue: 2 })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
    // No unresolved template holes.
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('[object Object]')
    expect(html).not.toContain('NaN')
  })

  it('links to the dashboard so the mail has somewhere to go', () => {
    expect(rentDueSoonEmail({ ...base, daysUntilDue: 2 }).html).toContain('https://rentybase.com/dashboard')
  })
})

describe('rentOverdueEmail', () => {
  it('singularises one day', () => {
    const { subject } = rentOverdueEmail({ ...base, daysOverdue: 1 })
    expect(subject).toContain('1 day overdue')
    expect(subject).not.toContain('1 days')
  })

  it('summarises several unpaid months in ONE email', () => {
    // The fan-out regression guard.
    const { subject, html } = rentOverdueEmail({
      ...base, daysOverdue: 120, outstandingMonths: 8, amount: '₹176,000',
    })
    expect(subject).toContain('8 unpaid months')
    expect(html).toContain('8 unpaid months')
    expect(html).toContain('₹176,000')
  })

  it('reads as a single month when only one is outstanding', () => {
    const { subject, html } = rentOverdueEmail({ ...base, daysOverdue: 4, outstandingMonths: 1 })
    expect(subject).toContain('4 days overdue')
    expect(html).not.toContain('unpaid months')
  })

  it('mentions a late fee only when one applies', () => {
    expect(rentOverdueEmail({ ...base, daysOverdue: 4, lateFee: '₹1,100' }).html).toContain('₹1,100')
    expect(rentOverdueEmail({ ...base, daysOverdue: 4, lateFee: null }).html).not.toContain('late fee of')
  })

  it('produces a complete document with no unresolved values', () => {
    const { html } = rentOverdueEmail({ ...base, daysOverdue: 9, outstandingMonths: 3 })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('NaN')
  })
})

describe('paymentAwaitingConfirmationEmail', () => {
  it('names the tenant and the amount, and points at confirmation', () => {
    const { subject, html } = paymentAwaitingConfirmationEmail({
      landlordName: 'Priya', tenantName: 'Aarav', propertyName: 'Flat 4B',
      amount: '₹22,000', method: 'UPI',
    })
    expect(subject).toContain('Aarav')
    expect(html).toContain('₹22,000')
    expect(html).toContain('UPI')
    expect(html).toContain('https://rentybase.com/dashboard')
  })
})

describe('escaping', () => {
  it('does not let a name inject markup into the email', () => {
    const { html } = rentDueSoonEmail({
      ...base, tenantName: '<script>alert(1)</script>', daysUntilDue: 1,
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes a property name in the subject line too', () => {
    // Subjects are plain text; the concern is a newline enabling header injection.
    const { subject } = rentDueSoonEmail({ ...base, propertyName: 'Flat\r\nBcc: x@y.z', daysUntilDue: 1 })
    expect(subject).not.toMatch(/[\r\n]/)
  })
})

describe('paymentConfirmedEmail', () => {
  const input = {
    tenantName: 'Aarav', landlordName: 'Priya Sharma', propertyName: 'Flat 4B',
    amount: '£1,250.00', period: 'September 2026', receiptNumber: '2026-09-A1B2',
  }

  it('names the period and property in the subject, and carries the receipt number', () => {
    const { subject, html } = paymentConfirmedEmail(input)
    expect(subject).toContain('September 2026')
    expect(subject).toContain('Flat 4B')
    expect(html).toContain('2026-09-A1B2')
    expect(html).toContain('£1,250.00')
    expect(html).toContain('https://rentybase.com/dashboard')
  })

  it('is a complete document with nothing unresolved', () => {
    const { html } = paymentConfirmedEmail(input)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('NaN')
  })

  it('escapes the subject against header injection', () => {
    const { subject } = paymentConfirmedEmail({ ...input, propertyName: 'X\r\nBcc: a@b.c' })
    expect(subject).not.toMatch(/[\r\n]/)
  })
})

describe('proofSubmittedEmail', () => {
  const input = { landlordName: 'Priya', tenantName: 'Aarav', propertyName: 'Flat 4B', photoCount: 12 }

  it('names the tenant and the count, and points at review', () => {
    const { subject, html } = proofSubmittedEmail(input)
    expect(subject).toContain('Aarav')
    expect(subject).toContain('Flat 4B')
    expect(html).toContain('12 photos')
    expect(html).toContain('https://rentybase.com/dashboard')
  })

  it('singularises one photo', () => {
    expect(proofSubmittedEmail({ ...input, photoCount: 1 }).html).toContain('1 photo<')
  })

  it('is a complete document with nothing unresolved', () => {
    const { html } = proofSubmittedEmail(input)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('NaN')
  })
})
