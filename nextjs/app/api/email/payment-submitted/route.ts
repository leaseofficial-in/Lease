import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { paymentAwaitingConfirmationEmail } from '@/lib/resend-rent'
import { getAuthedUser } from '@/lib/auth/authed-user'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'
import { getRegion } from '@/lib/i18n/regions'
import { formatCurrencyLocale } from '@/lib/i18n/formatters'
import { PAYMENT_METHOD_DISPLAY } from '@/lib/i18n/payments'

/**
 * Tell the landlord a tenant has recorded a payment that needs confirming.
 *
 * Nothing is marked paid until the landlord confirms it (030 made that real by
 * stopping tenants writing 'paid' themselves). But a confirmation step only works
 * if the landlord knows there is something to confirm — and until this route,
 * nothing told them. A payment could sit in pending_verification until the
 * landlord happened to open the app.
 *
 * Least privilege, on purpose:
 *   - The caller is the TENANT, resolved from their session. The body carries only
 *     a payment id; who to email is derived server-side, never taken from the
 *     client.
 *   - All reads run as the tenant under RLS. A tenant can read their own payment,
 *     their own rental, and — via "Tenants can view landlord profiles" — their
 *     landlord's profile. If any of those lookups returns nothing, the tenant is
 *     not a party to that payment and the request stops there. No service role.
 *   - The amount is formatted in the PROPERTY's currency.
 */
export async function POST(req: Request) {
  try {
    const limit = rateLimit(`payment-submitted:${clientIp(req)}`, { limit: 10, windowMs: 60 * 60 * 1000 })
    if (!limit.ok) return tooManyRequests(limit, 'Too many requests. Please try again later.')

    const authed = await getAuthedUser(req)
    if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, client: sb } = authed

    const body = await req.json().catch(() => ({}))
    const paymentId = typeof body.payment_id === 'string' ? body.payment_id : ''
    if (!/^[0-9a-f-]{36}$/i.test(paymentId)) {
      return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 })
    }

    // Under RLS: returns nothing unless the caller is the tenant on this payment.
    const { data: pmt } = await sb
      .from('rent_payments')
      .select(`
        id, amount, payment_method, tenant_id,
        rental:rentals!inner(
          landlord_id,
          property:properties(name, country_code),
          landlord:profiles!rentals_landlord_id_fkey(full_name, email),
          tenant:profiles!rentals_tenant_id_fkey(full_name)
        )
      `)
      .eq('id', paymentId)
      .eq('tenant_id', user.id)
      .maybeSingle()

    const rental = (pmt as { rental?: {
      property?: { name: string | null; country_code: string | null } | null
      landlord?: { full_name: string | null; email: string | null } | null
      tenant?: { full_name: string | null } | null
    } } | null)?.rental
    const to = rental?.landlord?.email
    if (!pmt || !rental || !to) {
      // Not a party to it, or no landlord address on file. Either way: nothing to
      // send, and nothing to tell the caller beyond that.
      return NextResponse.json({ ok: false }, { status: 202 })
    }

    const region = getRegion(rental.property?.country_code)
    const method =
      (PAYMENT_METHOD_DISPLAY as Record<string, { label: string }>)[pmt.payment_method || '']?.label
      || pmt.payment_method
      || 'a recorded payment'

    const { subject, html } = paymentAwaitingConfirmationEmail({
      landlordName: (rental.landlord?.full_name || 'there').split(' ')[0],
      tenantName: rental.tenant?.full_name || 'Your tenant',
      propertyName: rental.property?.name || 'your property',
      amount: formatCurrencyLocale(Number(pmt.amount), region.currency, region.locale),
      method,
    })

    await sendEmail({ to, subject, html })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[email/payment-submitted]', err)
    // The payment is already recorded; a failed notification must not surface as
    // a failed payment.
    return NextResponse.json({ ok: false }, { status: 202 })
  }
}
