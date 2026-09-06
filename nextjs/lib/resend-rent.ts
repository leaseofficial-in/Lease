// ─── Rent reminder and overdue emails ─────────────────────────────────────────
//
// RentyBase had no working retention mechanism. `rent-reminder-agent` ran daily
// via pg_cron for four months — 122 runs, every one reported "succeeded" — and
// sent nothing, because it is a "free tier implementation using Expo push
// notifications" and targets the abandoned Expo app. Zero of 22 profiles have a
// push_token, and the live Next.js/Capacitor app never registers one. It could
// reach nobody, and never could.
//
// Rent is a monthly obligation. A product that never tells anyone it is due
// depends on the user remembering to open it, which is the opposite of what a
// shared ledger is for. Meanwhile Resend is verified on rentybase.com and
// delivering.
//
// Markup follows the same inline-style conventions as welcomeEmail — this layout
// uses inline styles throughout, not CSS classes, because that is what mail
// clients honour. A reminder should look like the welcome mail the user already
// received, not like a different system.

import { emailLayout, esc } from './resend'

const CTA = (href: string, label: string) => `
  <p style="margin:28px 0 0;">
    <a href="${href}" style="display:inline-block;background:#0F4C5C;color:#F6F4EE;font-size:15px;font-weight:600;padding:13px 28px;border-radius:999px;text-decoration:none;">
      ${esc(label)}
    </a>
  </p>`

const BODY = (html: string) => `
  <tr><td style="padding:36px 40px;">
    ${html}
  </td></tr>`

const H1 = (title: string, sub: string) => `
  <tr><td style="background:linear-gradient(135deg,#0F4C5C 0%,#0E1413 100%);padding:36px 40px 32px;">
    <h1 style="font-family:'Instrument Serif',Georgia,serif;font-size:32px;font-weight:400;line-height:1.15;color:#F6F4EE;margin:0 0 8px;letter-spacing:-.02em;">
      ${esc(title)}
    </h1>
    <p style="font-size:14px;color:rgba(246,244,238,.7);margin:0;">${esc(sub)}</p>
  </td></tr>`

const P = (html: string) =>
  `<p style="font-size:15px;line-height:1.7;color:#2A332F;margin:0 0 18px;">${html}</p>`

const MUTED = (text: string) =>
  `<p style="font-size:13px;line-height:1.6;color:#8E948D;margin:24px 0 0;">${esc(text)}</p>`

export interface RentEmailInput {
  tenantName: string
  propertyName: string
  /** Preformatted in the PROPERTY's currency by the caller — never re-derived here. */
  amount: string
  /** Already localized by the caller, e.g. "5 September 2026". */
  dueDate: string
  landlordName: string
  daysUntilDue?: number
  daysOverdue?: number
  lateFee?: string | null
}

/** Sent a few days before rent is due. */
export function rentDueSoonEmail(input: RentEmailInput) {
  const { tenantName, propertyName, amount, dueDate, landlordName, daysUntilDue } = input
  const when =
    daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`

  return {
    subject: `Rent for ${propertyName} is due ${when}`,
    html: emailLayout(`
      ${H1(`Rent due ${when}.`, propertyName)}
      ${BODY(`
        ${P(`Hi ${esc(tenantName)},`)}
        ${P(`Your rent of <strong>${esc(amount)}</strong> for <strong>${esc(propertyName)}</strong> is due on <strong>${esc(dueDate)}</strong>.`)}
        ${P(`Once you have paid, record it in RentyBase so ${esc(landlordName)} can confirm it. That confirmed record is what your rent receipts and rental history are built from.`)}
        ${CTA('https://rentybase.com/dashboard', 'Record this payment')}
        ${MUTED('Reminders stop automatically once the payment is confirmed.')}
      `)}
    `),
  }
}

/** Sent once when rent has passed its due date — not daily. */
export function rentOverdueEmail(input: RentEmailInput) {
  const { tenantName, propertyName, amount, dueDate, daysOverdue, lateFee } = input
  const dayWord = daysOverdue === 1 ? 'day' : 'days'

  return {
    subject: `Rent for ${propertyName} is ${daysOverdue} ${dayWord} overdue`,
    html: emailLayout(`
      ${H1('Rent is overdue.', propertyName)}
      ${BODY(`
        ${P(`Hi ${esc(tenantName)},`)}
        ${P(`Rent of <strong>${esc(amount)}</strong> for <strong>${esc(propertyName)}</strong> was due on <strong>${esc(dueDate)}</strong>, ${esc(String(daysOverdue))} ${dayWord} ago.`)}
        ${lateFee ? P(`A late fee of <strong>${esc(lateFee)}</strong> has been applied under the terms of your agreement.`) : ''}
        ${P('If you have already paid, record it so your landlord can confirm — that clears the overdue flag and keeps your history intact.')}
        ${CTA('https://rentybase.com/dashboard', 'Record this payment')}
        ${MUTED('Sent once per overdue period, not daily. If this looks wrong, contact your landlord through RentyBase.')}
      `)}
    `),
  }
}

/** Sent to the landlord when a tenant submits a payment awaiting confirmation. */
export function paymentAwaitingConfirmationEmail(input: {
  landlordName: string
  tenantName: string
  propertyName: string
  amount: string
  method: string
}) {
  const { landlordName, tenantName, propertyName, amount, method } = input
  return {
    subject: `${tenantName} recorded a rent payment for ${propertyName}`,
    html: emailLayout(`
      ${H1('A payment needs confirming.', propertyName)}
      ${BODY(`
        ${P(`Hi ${esc(landlordName)},`)}
        ${P(`${esc(tenantName)} recorded a payment of <strong>${esc(amount)}</strong> for <strong>${esc(propertyName)}</strong> via ${esc(method)}.`)}
        ${P('Nothing is marked paid until you confirm it. Confirming issues the receipt and updates both sides of the record.')}
        ${CTA('https://rentybase.com/dashboard', 'Review and confirm')}
      `)}
    `),
  }
}
