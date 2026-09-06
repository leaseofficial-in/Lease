import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { proofSubmittedEmail } from '@/lib/resend-rent'
import { getAuthedUser } from '@/lib/auth/authed-user'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'

/**
 * Tell the landlord their tenant has submitted move-in photos.
 *
 * The in-app notification for this was written by the client straight into
 * `notifications`, a table with no INSERT policy -- so RLS refused every one, the
 * handler never checked the result, and the tenant was shown "Landlord notified".
 * 044 replaced that with an RPC that owns its own text; this is the half that
 * actually reaches a landlord, who does not live in the app.
 *
 * Shape follows payment-submitted: the caller is the TENANT, resolved from their
 * session, and the body carries only a rental id. Everything else is read as the
 * tenant under RLS, so a caller who is not the tenant of that rental gets nothing
 * back and the request stops. No service role anywhere.
 */
export async function POST(req: Request) {
  try {
    const limit = rateLimit(`proof-submitted:${clientIp(req)}`, { limit: 20, windowMs: 60 * 60 * 1000 })
    if (!limit.ok) return tooManyRequests(limit, 'Too many requests. Please try again later.')

    const authed = await getAuthedUser(req)
    if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, client: sb } = authed

    const body = await req.json().catch(() => ({}))
    const rentalId = typeof body.rental_id === 'string' ? body.rental_id : ''
    if (!/^[0-9a-f-]{36}$/i.test(rentalId)) {
      return NextResponse.json({ error: 'Missing rental_id' }, { status: 400 })
    }

    const { data: rental } = await sb
      .from('rentals')
      .select(`
        id,
        property:properties(name),
        landlord:profiles!rentals_landlord_id_fkey(full_name, email),
        tenant:profiles!rentals_tenant_id_fkey(full_name)
      `)
      .eq('id', rentalId)
      .eq('tenant_id', user.id)
      .maybeSingle()

    type Shape = {
      property?: { name: string | null } | null
      landlord?: { full_name: string | null; email: string | null } | null
      tenant?: { full_name: string | null } | null
    }
    const r = rental as Shape | null
    const to = r?.landlord?.email
    if (!r || !to) return NextResponse.json({ ok: false }, { status: 202 })

    // Count the photos server-side rather than trusting a number from the client.
    const { count } = await sb
      .from('proof_photos')
      .select('id, proof:proofs!inner(rental_id)', { count: 'exact', head: true })
      .eq('proof.rental_id', rentalId)

    const { subject, html } = proofSubmittedEmail({
      landlordName: (r.landlord?.full_name || 'there').split(' ')[0],
      tenantName: r.tenant?.full_name || 'Your tenant',
      propertyName: r.property?.name || 'your property',
      photoCount: count ?? 0,
    })

    await sendEmail({ to, subject, html })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[email/proof-submitted]', err)
    return NextResponse.json({ ok: false }, { status: 202 })
  }
}
