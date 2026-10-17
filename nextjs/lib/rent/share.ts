// ─── Rent links a landlord sends without the tenant having an account ─────────
//
// Every rent row has a share_token (migration 052). /rent/<token> is a reminder
// before the rent is paid and a receipt after. These helpers build that link, the
// WhatsApp message that carries it, and the UPI deep link the page offers.
//
// Pure functions so they can be tested; the dashboard and the public page both
// use them, and the message the tenant receives must not depend on which one.

import { normalizePhoneLocale } from '@/lib/i18n/formatters'

const SITE = 'https://rentybase.com'

export function rentShareUrl(shareToken: string, origin: string = SITE): string {
  return `${origin.replace(/\/$/, '')}/rent/${shareToken}`
}

/**
 * Digits only, with the country code, as wa.me wants them. Returns null for
 * anything that is not plausibly a phone number, so the caller can fall back to
 * WhatsApp's own contact picker rather than open a chat with a wrong number.
 */
export function phoneForWhatsApp(phone: string | null | undefined, dialCode: string, localLength: number[]): string | null {
  if (!phone) return null
  const normalised = normalizePhoneLocale(phone, dialCode, localLength)
  const digits = normalised.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15 ? digits : null
}

/** The value stored in rentals.tenant_phone: '+' and digits, or null. */
export function phoneForStorage(phone: string | null | undefined, dialCode: string, localLength: number[]): string | null {
  const digits = phoneForWhatsApp(phone, dialCode, localLength)
  return digits ? `+${digits}` : null
}

export function whatsAppUrl(text: string, phoneDigits?: string | null): string {
  return `https://wa.me/${phoneDigits || ''}?text=${encodeURIComponent(text)}`
}

export type RentMessageInput = {
  tenantName?: string | null
  propertyName?: string | null
  amount: string        // already formatted, e.g. "₹12,000"
  month: string         // already formatted, e.g. "Oct 2026"
  url: string
}

const firstName = (n?: string | null) => (n || '').trim().split(/\s+/)[0] || 'there'

export function reminderMessage(m: RentMessageInput): string {
  return (
    `Hi ${firstName(m.tenantName)}, a reminder that rent of ${m.amount} for ${m.month}` +
    (m.propertyName ? ` (${m.propertyName})` : '') +
    ` is due.\n\nDetails and how to pay: ${m.url}`
  )
}

export function receiptMessage(m: RentMessageInput): string {
  return (
    `Hi ${firstName(m.tenantName)}, I've received your rent of ${m.amount} for ${m.month}. Thank you!` +
    `\n\nYour receipt: ${m.url}`
  )
}

/**
 * upi://pay deep link. Opens the tenant's UPI app with the payee, amount and note
 * filled in. Only meaningful in India and only with a plausible VPA; null
 * otherwise so the page does not offer a button that opens nothing.
 */
export function upiPayUrl(opts: { vpa?: string | null; payeeName?: string | null; amount: number; note: string }): string | null {
  const vpa = (opts.vpa || '').trim()
  if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/.test(vpa)) return null
  if (!(opts.amount > 0)) return null
  const q = new URLSearchParams({
    pa: vpa,
    pn: (opts.payeeName || 'Landlord').slice(0, 50),
    am: opts.amount.toFixed(2),
    cu: 'INR',
    tn: opts.note.slice(0, 50),
  })
  return `upi://pay?${q.toString()}`
}
