import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUserDetail, getUsers } from '@/lib/admin/data'
import { activationStage } from '@/lib/admin/activation'
import { ago, countryLabel, fmtDate, fmtDateTime, fmtMonth, money } from '@/lib/admin/format'
import { RevealPayout } from '@/components/admin/reveal-payout'
import { Avatar, Badge, Card, DataTable, Empty, Field, StageBadge, StatusBadge, type Column } from '@/components/admin/ui'
import type { AdminUserDetail } from '@/lib/admin/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()

  const [d, users] = await Promise.all([getUserDetail(id), getUsers()])
  if (!d) notFound()

  const now = new Date()
  const p = d.profile
  const summary = users.find((u) => u.id === id)
  const stage = summary ? activationStage(summary, now) : null

  const rentalCols: Column<AdminUserDetail['rentals'][number]>[] = [
    {
      key: 'property', header: 'Property', cell: (r) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{r.property_name}</span>
          <span className="block text-xs text-[var(--rb-ink-3)]">{[r.city, r.country_code].filter(Boolean).join(', ')}</span>
        </span>
      ),
    },
    { key: 'side', header: 'As', cell: (r) => <Badge tone={r.side === 'landlord' ? 'action' : 'accent'}>{r.side}</Badge> },
    {
      key: 'other', header: counterpartHeader(p.role), cell: (r) => {
        if (r.side === 'tenant') return <PersonLink id={r.landlord_id} name={r.landlord_name} />
        if (r.tenant_id) return <PersonLink id={r.tenant_id} name={r.tenant_name} />
        return r.tenant_name ? <span>{r.tenant_name} <Badge>managed</Badge></span> : <span className="text-[var(--rb-ink-3)]">No tenant yet</span>
      },
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'rent', header: 'Rent', align: 'right', cell: (r) => money(r.monthly_rent, r.country_code) },
    {
      key: 'payments', header: 'Payments', cell: (r) => (
        <span className="text-xs">
          {r.paid} paid{r.pending > 0 && <> · <span className="text-[var(--rb-warning)]">{r.pending} pending</span></>}
          {r.overdue > 0 && <> · <span className="text-[var(--rb-danger)]">{r.overdue} overdue</span></>}
        </span>
      ),
    },
    { key: 'start', header: 'Start', cell: (r) => fmtDate(r.start_date), desktopOnly: true },
  ]

  const paymentCols: Column<AdminUserDetail['payments'][number]>[] = [
    { key: 'month', header: 'Month', cell: (x) => <span className="font-medium">{fmtMonth(x.month)}</span> },
    { key: 'property', header: 'Property', cell: (x) => x.property_name },
    { key: 'amount', header: 'Amount', align: 'right', cell: (x) => money(Number(x.amount) + Number(x.late_fee || 0), x.country_code) },
    { key: 'status', header: 'Status', cell: (x) => <StatusBadge status={x.status} /> },
    { key: 'method', header: 'Method', cell: (x) => x.payment_method ?? '—', desktopOnly: true },
    { key: 'paid', header: 'Paid on', cell: (x) => fmtDate(x.paid_at) },
  ]

  return (
    <>
      <Link href="/admin/users" className="text-sm text-[var(--rb-action)] hover:underline">← All users</Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={p.full_name} url={p.avatar_url} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[28px] leading-tight" style={{ fontFamily: 'var(--rb-font-display)' }}>{p.full_name || 'Unnamed'}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--rb-ink-3)]">
            {p.role ? <Badge>{p.role}</Badge> : <Badge tone="danger">no role</Badge>}
            {stage && <StageBadge stage={stage} />}
            {p.is_admin && <Badge tone="accent">platform admin</Badge>}
            {p.banned_until && new Date(p.banned_until) > now && <Badge tone="danger">banned</Badge>}
            <span>Joined {fmtDate(p.created_at)} · last sign-in {ago(p.last_sign_in_at, now)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card title="Profile">
            <Field label="Email">{p.email ?? '—'}</Field>
            <Field label="Phone">{p.phone ?? '—'}</Field>
            <Field label="Sign-in">{p.provider}{p.email_confirmed_at ? '' : ' · unverified'}</Field>
            <Field label="Country">{countryLabel(p.country_code)}</Field>
            <Field label="Currency / locale">{[p.currency_code, p.locale].filter(Boolean).join(' · ') || '—'}</Field>
            <Field label="Timezone">{p.timezone ?? '—'}</Field>
            <Field label="Push">{p.push_enabled ? 'Enabled' : 'Off'}</Field>
            <Field label="PAN / Aadhaar">{p.has_pan ? 'PAN on file' : 'No PAN'} · {p.has_aadhaar ? 'Aadhaar on file' : 'No Aadhaar'}</Field>
            <Field label="Payout details">
              {p.has_upi || p.has_payout_details ? <RevealPayout userId={p.id} /> : 'None'}
            </Field>
            <Field label="User id"><code className="text-[11px]">{p.id}</code></Field>
          </Card>

          <Card title="At a glance">
            <Field label="Properties">{d.properties.filter((x) => !x.archived_at).length} active · {d.properties.filter((x) => x.archived_at).length} archived</Field>
            <Field label="Rentals">{d.rentals.length}</Field>
            <Field label="Messages sent">{d.counts.messages_sent}</Field>
            <Field label="Repairs raised">{d.counts.repairs_raised}</Field>
            <Field label="Unread notifications">{d.counts.notifications_unread}</Field>
            <Field label="Last active">{ago(summary?.last_active_at, now)}</Field>
          </Card>

          {d.referrals.length > 0 && (
            <Card title="Referrals">
              {d.referrals.map((r, i) => (
                <Field key={i} label={r.side === 'tenant' ? `Referred ${r.other_name ?? 'landlord'}` : `From ${r.other_name ?? 'tenant'}`}>
                  <StatusBadge status={r.status} /> <span className="text-xs text-[var(--rb-ink-3)]">{fmtDate(r.created_at)}</span>
                </Field>
              ))}
            </Card>
          )}

          <Card title="Admin views">
            {d.recent_views.length === 0 ? <Empty>No views yet.</Empty> : d.recent_views.map((v, i) => (
              <Field key={i} label={v.action === 'reveal_payout' ? 'Revealed payout' : 'Viewed'}>
                <span className="text-xs">{v.admin_name ?? 'admin'} · {fmtDateTime(v.created_at)}</span>
              </Field>
            ))}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {p.role !== 'tenant' && (
            <Card title={`Properties (${d.properties.length})`}>
              {d.properties.length === 0 ? <Empty>No properties.</Empty> : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {d.properties.map((x) => (
                    <li key={x.id} className="rounded-[var(--rb-radius-md)] border border-[var(--rb-border)] p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">{x.name}</span>
                        {x.archived_at && <Badge>archived</Badge>}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--rb-ink-3)]">
                        {[x.property_type, x.city, x.country_code].filter(Boolean).join(' · ')} · {x.rentals} rental{x.rentals === 1 ? '' : 's'} · added {fmtDate(x.created_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card title={`Rentals (${d.rentals.length})`}>
            <DataTable rows={d.rentals} columns={rentalCols} rowKey={(r) => r.id} empty="No rentals." />
          </Card>

          <Card title={`Payments (${d.payments.length}${d.payments.length === 60 ? '+' : ''})`}>
            <DataTable rows={d.payments} columns={paymentCols} rowKey={(x) => x.id} empty="No rent rows." />
          </Card>

          <Card title="Activity">
            {d.activity.length === 0 ? <Empty>No tracked activity.</Empty> : (
              <ol className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
                {d.activity.map((a, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 border-b border-[var(--rb-border-soft)] py-1.5 text-sm last:border-b-0">
                    <span className="min-w-0">
                      <span className="font-medium">{a.name.replace(/_/g, ' ')}</span>
                      <span className="ml-2 text-xs text-[var(--rb-ink-3)]">{a.source === 'rental' ? 'rental event' : 'product'}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--rb-ink-3)]" title={fmtDateTime(a.at)}>{ago(a.at, now)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title={`Emails (${d.emails.length})`}>
              {d.emails.length === 0 ? <Empty>No emails sent.</Empty> : (
                <ul className="max-h-[320px] space-y-1 overflow-y-auto">
                  {d.emails.map((e, i) => (
                    <li key={i} className="border-b border-[var(--rb-border-soft)] py-1.5 text-sm last:border-b-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{e.email_type.replace(/_/g, ' ')}</span>
                        <StatusBadge status={e.status} />
                      </div>
                      <div className="text-xs text-[var(--rb-ink-3)]">
                        {fmtDateTime(e.created_at)}{e.skip_reason ? ` · ${e.skip_reason}` : ''}{e.error ? ` · ${e.error}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={`App errors (${d.errors.length})`}>
              {d.errors.length === 0 ? <Empty>No errors from this user.</Empty> : (
                <ul className="max-h-[320px] space-y-1 overflow-y-auto">
                  {d.errors.map((e, i) => (
                    <li key={i} className="border-b border-[var(--rb-border-soft)] py-1.5 text-sm last:border-b-0">
                      <div className="line-clamp-2 break-words text-[var(--rb-danger)]">{e.message}</div>
                      <div className="text-xs text-[var(--rb-ink-3)]">{e.context ?? '—'} · {fmtDateTime(e.created_at)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

function counterpartHeader(role: string | null) {
  return role === 'tenant' ? 'Landlord' : 'Tenant / landlord'
}

function PersonLink({ id, name }: { id: string; name: string | null }) {
  return <Link href={`/admin/users/${id}`} className="text-[var(--rb-action)] hover:underline">{name || 'Unnamed'}</Link>
}
