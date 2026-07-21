import { NextResponse } from 'next/server'
import { sendEmail, notifyAdmin, contactAdminEmail, contactAutoReplyEmail } from '@/lib/resend'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'

/**
 * Public contact form.
 *
 * This is unauthenticated by necessity, and it sends mail to an address supplied in
 * the request, so it is the most abusable surface on the site: without limits it is
 * both an email-bombing amplifier (attacker supplies a victim's address, we send the
 * auto-reply) and a way to burn the Resend quota. Two independent windows apply —
 * one per IP, one per recipient address — so rotating either alone isn't enough.
 */

const LIMITS = {
  // Field caps. Anything longer is almost certainly abuse, not a real enquiry.
  name: 100,
  subject: 200,
  message: 5_000,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: Request) {
  try {
    const ipLimit = rateLimit(`contact:ip:${clientIp(req)}`, {
      limit: 3,
      windowMs: 10 * 60 * 1000,
    })
    if (!ipLimit.ok) {
      return tooManyRequests(ipLimit, 'Too many messages. Please try again shortly.')
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const name = str(body.name)
    const email = str(body.email)
    const subject = str(body.subject)
    const message = str(body.message)

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }
    if (message.length < 10) {
      return NextResponse.json({ error: 'Message is too short.' }, { status: 400 })
    }
    if (
      name.length > LIMITS.name ||
      subject.length > LIMITS.subject ||
      message.length > LIMITS.message
    ) {
      return NextResponse.json({ error: 'One or more fields are too long.' }, { status: 400 })
    }

    // Second window keyed on the recipient, so an attacker behind rotating IPs still
    // can't use us to flood one victim's inbox with auto-replies.
    const recipientLimit = rateLimit(`contact:to:${email.toLowerCase()}`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    })

    const admin = contactAdminEmail({ name, email, subject, message })
    const autoReply = contactAutoReplyEmail({ name, subject, message })

    const [adminResult, autoReplyResult] = await Promise.allSettled([
      notifyAdmin(admin.subject, admin.html),
      // Skip the auto-reply when this address is over its window. The admin still
      // gets the message, so a genuine sender is never silently dropped.
      recipientLimit.ok
        ? sendEmail({
            to: email,
            subject: autoReply.subject,
            html: autoReply.html,
            replyTo: 'hello@rentybase.com',
          })
        : Promise.resolve(null),
    ])

    if (adminResult.status === 'rejected') {
      console.error('[contact] admin email failed:', adminResult.reason)
    }
    if (autoReplyResult.status === 'rejected') {
      console.error('[contact] auto-reply failed:', autoReplyResult.reason)
    }

    // As long as the admin email landed, the message reached us.
    if (adminResult.status === 'fulfilled') {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json(
      { error: 'Failed to send message. Please try hello@rentybase.com directly.' },
      { status: 500 },
    )
  } catch (err) {
    console.error('[contact]', err)
    return NextResponse.json(
      { error: 'Server error. Please try hello@rentybase.com directly.' },
      { status: 500 },
    )
  }
}
