import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { sendEmail, welcomeEmail } from '@/lib/resend'
import { createClient } from '@/lib/supabase/server'
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

/**
 * Resolves the caller. Web uses cookie auth; the Capacitor Android app stores its
 * session in native Preferences rather than cookies, so it sends a bearer token.
 */
async function getAuthedUser(req: Request) {
  const cookieClient = await createClient()
  const { data: cookieAuth } = await cookieClient.auth.getUser()
  if (cookieAuth.user) return cookieAuth.user

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null
  if (!token) return null

  // Fresh client with no cookie adapter — we only want to validate this token.
  const bearerClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
  const { data } = await bearerClient.auth.getUser(token)
  return data.user ?? null
}

export async function POST(req: Request) {
  try {
    const limit = rateLimit(`welcome:${clientIp(req)}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!limit.ok) {
      return tooManyRequests(limit, 'Too many requests. Please try again later.')
    }

    const user = await getAuthedUser(req)
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
