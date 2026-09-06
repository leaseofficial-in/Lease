import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { paymentConfirmedEmail } from '@/lib/resend-rent'
import { getAuthedUser } from '@/lib/auth/authed-user'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'
import { getRegion } from '@/lib/i18n/regions'
import { formatCurrencyLocale } from '@/lib/i18n/formatters'
import { monthLabel } from '@/lib/date/month-label'

/**
 * Tell the tenant their payment has been confirmed. The receipt moment.
 *
 * Mirror image of payment-submitted, with the roles reversed and the same
 * least-privilege shape:
 *   - The caller is the LANDLORD, resolved from their session. The body carries
 *     only a payment id and the receipt number the dashboard generated.
 *   - All reads run as the landlord under RLS: "Landlords view payments for their
 *     rentals" and "Landlords can view tenant profiles". If the caller does not own
 *     the rental, the lookup returns nothing and the request stops. No service role.
 *   - The amount is formatted in the PROPERTY's currency, the period in the
 *     property's locale.
 *   - Only sends for a payment whose status is actually 'paid'. The confirmation
 *     RPC ran first; this never claims something the ledger does not say.
 */
export async function POST(req: Request) {
  try {
    const limit = rateLimit(`payment-confirmed:${clientIp(req)}`, { limit: 30, windowMs: 60 * 60 * 1000 })
    if (!limit.ok) return tooManyRequests(limit, 'Too many requests. Please try again later.')

    const authed = await getAuthedUser(req)
    if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, client: sb } = authed

    const body = await req.json().catch(() => ({}))
    const paymentId = typeof body.payment_id === 'string' ? body.payment_id : ''
    const receiptNumber = typeof body.receipt_number === 'string' ? body.receipt_number.slice(0, 40) : ''
    if (!/^[0-9a-f-]{36}$/i.test(paymentId)) {
      return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 })
    }

    const { data: pmt } = await sb
      .from('rent_payments')
      .select(`
        id, amount, month, status,
        rental:rentals!inner(
          landlord_id,
          property:properties(name, country_code),
          landlord:profiles!rentals_landlord_id_fkey(full_name),
          tenant:profiles!rentals_tenant_id_fkey(full_name, email)
        )
      `)
      .eq('id', paymentId)
      .eq('rental.landlord_id', user.id)
      .maybeSingle()

    type Shape = {
      status: string; amount: number; month: string
      rental?: {
        property?: { name: string | null; country_code: string | null } | null
        landlord?: { full_name: string | null } | null
        tenant?: { full_name: string | null; email: string | null } | null
      } | null
    }
    const p = pmt as Shape | null
    const to = p?.rental?.tenant?.email
    if (!p || p.status !== 'paid' || !to) {
      return NextResponse.json({ ok: false }, { status: 202 })
    }

    const region = getRegion(p.rental?.property?.country_code)
    const { subject, html } = paymentConfirmedEmail({
      tenantName: (p.rental?.tenant?.full_name || 'there').split(' ')[0],
      landlordName: p.rental?.landlord?.full_name || 'Your landlord',
      propertyName: p.rental?.property?.name || 'your rental',
      amount: formatCurrencyLocale(Number(p.amount), region.currency, region.locale),
      period: monthLabel(p.month, region.locale, 'long'),
      receiptNumber: receiptNumber || `${p.month.slice(0, 7)}-${paymentId.slice(-4).toUpperCase()}`,
    })

    await sendEmail({ to, subject, html })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[email/payment-confirmed]', err)
    // The confirmation already happened; a failed notification must not read as
    // a failed confirmation.
    return NextResponse.json({ ok: false }, { status: 202 })
  }
}
