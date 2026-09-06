import { NextResponse } from 'next/server'
import { sendEmail, welcomeEmail } from '@/lib/resend'
import { getAuthedUser } from '@/lib/auth/authed-user'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'

/**
 * Sends the post-signup welcome email.
 *
 * This endpoint used to accept an arbitrary `email` from the request body with no
 * authentication, which made it an open relay: anyone could make RentyBase send
 * branded mail to any address. The recipient is now taken from the authenticated
 * session and the body's `email` field is ignored entirely.
 */

// The signup screen offers three roles but the email only has two variants. 'pg'
// (PG / hostel manager) is a landlord-side role, so it must map to the landlord
// email — it previously fell through to the 'tenant' default and sent PG managers
// the wrong welcome mail.
const ROLE_ALIASES: Record<string, string> = { landlord: 'landlord', pg: 'landlord', tenant: 'tenant' }

export async function POST(req: Request) {
  try {
    const limit = rateLimit(`welcome:${clientIp(req)}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!limit.ok) {
      return tooManyRequests(limit, 'Too many requests. Please try again later.')
    }

    const user = (await getAuthedUser(req))?.user
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    // Only `name` and `role` come from the client, and both are constrained. The
    // recipient is always the session user's own verified address.
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
    const role = (typeof body.role === 'string' && ROLE_ALIASES[body.role]) || 'tenant'
    if (!name) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 })
    }

    const { subject, html } = welcomeEmail({ name, role, email: user.email })
    await sendEmail({ to: user.email, subject, html })

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Never echo the raw error back — it can contain Resend API detail.
    console.error('[email/welcome]', err)
    // Signup must not fail because a welcome email didn't send.
    return NextResponse.json({ ok: false }, { status: 202 })
  }
}
