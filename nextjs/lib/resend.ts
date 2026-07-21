const RESEND_API_KEY = process.env.RESEND_API_KEY!
const FROM = 'RentyBase <hello@rentybase.com>'
const ADMIN = 'leaseofficial.in@gmail.com'

interface SendOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  bcc?: string
}

export async function sendEmail(opts: SendOptions) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      ...(opts.bcc ? { bcc: [opts.bcc] } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
  return res.json()
}

// ── Admin notify (used internally) ──────────────────────────────
export function notifyAdmin(subject: string, html: string) {
  return sendEmail({ to: ADMIN, subject, html })
}

/**
 * Escapes a value for interpolation into email HTML.
 *
 * Every template below is a tagged-free template literal, so any unescaped value
 * lands directly in the markup. Contact-form input reaches the admin inbox and the
 * sender's own auto-reply, so raw interpolation let an attacker inject arbitrary
 * links and markup into mail sent from our domain. Escape at the boundary — always
 * wrap user-controlled values in `esc()`.
 *
 * Escapes quotes too, so it is also safe inside an HTML attribute value.
 */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Escapes a value for use as an email *subject*. Subjects are plain text, so the
 * risk is header injection via CR/LF rather than HTML.
 */
function escSubject(value: unknown): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 200)
}

// ── Shared layout wrapper ────────────────────────────────────────
export function emailLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>RentyBase</title>
</head>
<body style="margin:0;padding:0;background:#F6F4EE;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F6F4EE;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="padding-bottom:28px;">
          <a href="https://rentybase.com" style="text-decoration:none;">
            <span style="font-family:'Instrument Serif',Georgia,serif;font-size:22px;color:#0E1413;">
              Renty<em style="font-style:italic;color:#C97A3A;">Base</em>
            </span>
          </a>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#FFFFFF;border-radius:18px;border:1px solid #E6E2D7;overflow:hidden;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 8px;text-align:center;">
          <p style="font-size:12px;color:#8E948D;margin:0 0 6px;">
            © ${new Date().getFullYear()} RentyBase · Built for India
          </p>
          <p style="font-size:12px;color:#8E948D;margin:0;">
            <a href="https://rentybase.com/privacy" style="color:#8E948D;">Privacy</a> ·
            <a href="https://rentybase.com/terms" style="color:#8E948D;"> Terms</a> ·
            <a href="https://rentybase.com" style="color:#8E948D;"> rentybase.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Email templates ──────────────────────────────────────────────

export function welcomeEmail({ name, role, email }: { name: string; role: string; email: string }) {
  const isLandlord = role === 'landlord' || role === 'pg'
  const roleLabel = role === 'pg' ? 'PG / Hostel Manager' : isLandlord ? 'Landlord' : 'Tenant'
  const nextStep = isLandlord
    ? { cta: 'Add your first property', href: 'https://rentybase.com/dashboard', desc: 'Takes under a minute. Invite your tenant by sharing a link.' }
    : { cta: 'View your dashboard', href: 'https://rentybase.com/dashboard', desc: 'Join your landlord\'s ledger via invite link, or explore your dashboard.' }
  const firstName = name.split(' ')[0] || name

  const html = emailLayout(`
    <!-- Teal band -->
    <tr><td style="background:linear-gradient(135deg,#0F4C5C 0%,#0E1413 100%);padding:36px 40px 32px;">
      <p style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.14em;color:rgba(201,122,58,.9);text-transform:uppercase;margin:0 0 12px;">WELCOME TO RENTYBASE</p>
      <h1 style="font-family:'Instrument Serif',Georgia,serif;font-size:36px;font-weight:400;line-height:1.1;color:#F6F4EE;margin:0 0 8px;letter-spacing:-.02em;">
        Welcome, <em style="font-style:italic;color:#C97A3A;">${esc(firstName)}.</em>
      </h1>
      <p style="font-size:14px;color:rgba(246,244,238,.7);margin:0;">Your rental record is live.</p>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:36px 40px;">
      <p style="font-size:15px;line-height:1.7;color:#2A332F;margin:0 0 24px;">
        You're signed in as a <strong style="color:#0E1413;">${esc(roleLabel)}</strong> with <strong>${esc(email)}</strong>.
        Everything you need for your rental — receipts, ledger, deposit, proof — is in one place. Free.
      </p>

      <!-- What's included -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F6F4EE;border-radius:12px;padding:0;margin-bottom:28px;">
        <tr><td style="padding:20px 24px 4px;">
          <p style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#5C645F;margin:0 0 14px;">WHAT'S READY FOR YOU</p>
        </td></tr>
        ${[
          ['HRA Rent Receipts', 'Section 10(13A)-valid, auto-generated'],
          ['Shared Payment Ledger', 'Both sides see the same record'],
          ['Move-in Photo Proof', 'Timestamped, geotagged, sealed'],
          ['Deposit Ledger', 'Full lifecycle with deduction reasons'],
        ].map(([t, d]) => `
        <tr><td style="padding:0 24px 14px;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="vertical-align:top;padding-right:10px;padding-top:2px;">
                <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#1F7A55;color:#fff;font-size:10px;font-weight:700;text-align:center;line-height:16px;">✓</span>
              </td>
              <td>
                <div style="font-size:14px;font-weight:600;color:#0E1413;">${t}</div>
                <div style="font-size:13px;color:#5C645F;margin-top:1px;">${d}</div>
              </td>
            </tr>
          </table>
        </td></tr>`).join('')}
        <tr><td style="height:8px;"></td></tr>
      </table>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
        <tr><td>
          <p style="font-size:14px;color:#2A332F;margin:0 0 12px;">${nextStep.desc}</p>
          <a href="${nextStep.href}" style="display:inline-block;background:#0F4C5C;color:#F6F4EE;font-size:15px;font-weight:600;padding:13px 28px;border-radius:999px;text-decoration:none;">
            ${nextStep.cta} →
          </a>
        </td></tr>
      </table>

      <p style="font-size:13px;color:#8E948D;line-height:1.6;margin:0;">
        Questions? Reply to this email or write to
        <a href="mailto:hello@rentybase.com" style="color:#0F4C5C;">hello@rentybase.com</a> — we read every message.
      </p>
    </td></tr>
  `)

  return { subject: escSubject(`Welcome to RentyBase, ${firstName} — your ledger is live`), html }
}

export function contactAdminEmail({ name, email, subject, message }: { name: string; email: string; subject: string; message: string }) {
  const html = emailLayout(`
    <tr><td style="background:#0F4C5C;padding:24px 36px;">
      <p style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.14em;color:rgba(201,122,58,.9);text-transform:uppercase;margin:0 0 8px;">NEW CONTACT FORM MESSAGE</p>
      <h2 style="font-family:'Instrument Serif',Georgia,serif;font-size:26px;font-weight:400;color:#F6F4EE;margin:0;letter-spacing:-.015em;">${esc(subject)}</h2>
    </td></tr>
    <tr><td style="padding:32px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F6F4EE;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:13px;"><span style="color:#5C645F;">From:</span> <strong>${esc(name)}</strong></p>
          <p style="margin:0;font-size:13px;"><span style="color:#5C645F;">Email:</span> <a href="mailto:${encodeURIComponent(email)}" style="color:#0F4C5C;">${esc(email)}</a></p>
        </td></tr>
      </table>
      <p style="font-size:15px;line-height:1.75;color:#2A332F;white-space:pre-wrap;margin:0 0 28px;">${esc(message)}</p>
      <a href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${subject}`)}" style="display:inline-block;background:#0F4C5C;color:#F6F4EE;font-size:14px;font-weight:600;padding:11px 22px;border-radius:999px;text-decoration:none;">Reply to ${esc(name)} →</a>
    </td></tr>
  `)
  return { subject: `[RentyBase Contact] ${escSubject(subject)}`, html }
}

export function contactAutoReplyEmail({ name, subject, message }: { name: string; subject: string; message: string }) {
  const firstName = name.split(' ')[0] || name
  const html = emailLayout(`
    <tr><td style="background:linear-gradient(135deg,#0F4C5C 0%,#0E1413 100%);padding:32px 40px;">
      <p style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.14em;color:rgba(201,122,58,.9);text-transform:uppercase;margin:0 0 10px;">MESSAGE RECEIVED</p>
      <h1 style="font-family:'Instrument Serif',Georgia,serif;font-size:30px;font-weight:400;color:#F6F4EE;margin:0;letter-spacing:-.02em;">
        Got it, <em style="font-style:italic;color:#C97A3A;">${esc(firstName)}.</em>
      </h1>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <p style="font-size:15px;line-height:1.7;color:#2A332F;margin:0 0 24px;">
        Thanks for reaching out. We've received your message and will get back to you within 1–2 business days.
      </p>

      <!-- Echo their message -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F6F4EE;border-radius:12px;border-left:3px solid #0F4C5C;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8E948D;margin:0 0 10px;">YOUR MESSAGE</p>
          <p style="font-size:13px;font-weight:600;color:#0E1413;margin:0 0 6px;">${esc(subject)}</p>
          <p style="font-size:14px;line-height:1.65;color:#5C645F;margin:0;white-space:pre-wrap;">${esc(message.length > 300 ? message.slice(0, 300) + '…' : message)}</p>
        </td></tr>
      </table>

      <p style="font-size:14px;color:#2A332F;line-height:1.6;margin:0 0 24px;">
        In the meantime, you might find answers in our
        <a href="https://rentybase.com/blog" style="color:#0F4C5C;">blog</a> or
        <a href="https://rentybase.com/features" style="color:#0F4C5C;">features page</a>.
      </p>

      <a href="https://rentybase.com" style="display:inline-block;background:#0F4C5C;color:#F6F4EE;font-size:14px;font-weight:600;padding:11px 22px;border-radius:999px;text-decoration:none;">Back to RentyBase →</a>
    </td></tr>
  `)
  return { subject: `We got your message — RentyBase`, html }
}
