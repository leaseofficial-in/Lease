import Link from 'next/link'
import { getOverview, getUsers } from '@/lib/admin/data'
import { activationStage, STAGE_ORDER, type Stage } from '@/lib/admin/activation'
import { ago, countryLabel, fmtDate, money } from '@/lib/admin/format'
import { Avatar, Badge, Card, Empty, MiniBars, PageHeader, Stat, StageBadge, STAGE_META } from '@/components/admin/ui'

export default async function AdminOverviewPage() {
  const [o, users] = await Promise.all([getOverview(), getUsers()])
  const now = new Date()

  const stages = new Map<Stage, number>()
  for (const u of users) {
    const s = activationStage(u, now)
    stages.set(s, (stages.get(s) ?? 0) + 1)
  }
  const recent = users.slice(0, 8)

  return (
    <>
      <PageHeader title="Platform overview" subtitle={`Everything across ${o.users} accounts, as of ${fmtDate(now.toISOString())}.`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={o.users} hint={`${o.landlords} landlords · ${o.tenants} tenants`} href="/admin/users" />
        <Stat label="New signups" value={o.new_7d} hint={`last 7 days · ${o.new_30d} in 30`} href="/admin/users?sort=newest" />
        <Stat label="Signed in" value={o.signed_in_7d} hint={`last 7 days · ${o.signed_in_30d} in 30`} />
        <Stat label="No role picked" value={o.no_role} hint="stuck at signup" href="/admin/users?stage=onboarding" tone={o.no_role > 0 ? 'warning' : undefined} />
        <Stat label="Properties" value={o.properties} hint="not archived" />
        <Stat label="Active rentals" value={o.rentals_active} hint={`${o.rentals_pending} pending · ${o.managed_tenants} managed`} />
        <Stat label="App errors" value={o.errors_24h} hint="last 24 hours" href="/admin/health" tone={o.errors_24h > 0 ? 'danger' : undefined} />
        <Stat label="Failed emails" value={o.emails_failed_7d} hint="last 7 days" href="/admin/health" tone={o.emails_failed_7d > 0 ? 'danger' : undefined} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Signups per week" className="lg:col-span-2">
          <MiniBars
            label="Signups per week, last 12 weeks"
            data={o.signups_by_week.map((w) => ({ key: w.week, value: w.count, title: fmtDate(w.week) }))}
          />
        </Card>

        <Card title="Activation" action={<Link href="/admin/insights" className="text-xs font-medium text-[var(--rb-action)] hover:underline">Insights →</Link>}>
          <ul className="space-y-2">
            {STAGE_ORDER.map((s) => (
              <li key={s}>
                <Link href={`/admin/users?stage=${s}`} className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-[var(--rb-canvas)]">
                  <span className="flex items-center gap-2"><StageBadge stage={s} /><span className="text-xs text-[var(--rb-ink-3)]">{STAGE_META[s].hint}</span></span>
                  <span className="text-sm font-semibold tabular-nums">{stages.get(s) ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Rent this month">
          {o.rent_this_month.length === 0 ? <Empty>No rent rows for this month yet.</Empty> : (
            <ul className="divide-y divide-[var(--rb-border-soft)]">
              {o.rent_this_month.map((r) => {
                const pct = r.due > 0 ? Math.round((r.paid / r.due) * 100) : 0
                return (
                  <li key={r.country_code} className="py-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>{countryLabel(r.country_code)} <span className="text-xs text-[var(--rb-ink-3)]">· {r.rows} rows</span></span>
                      <span className="tabular-nums"><b>{money(r.paid, r.country_code)}</b> <span className="text-[var(--rb-ink-3)]">of {money(r.due, r.country_code)}</span></span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--rb-fill)]">
                      <div className="h-full rounded-full bg-[var(--rb-success)]" style={{ width: `${pct}%` }} />
                    </div>
                    {r.overdue > 0 && <div className="mt-1 text-xs text-[var(--rb-danger)]">{r.overdue} overdue</div>}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Latest signups" action={<Link href="/admin/users" className="text-xs font-medium text-[var(--rb-action)] hover:underline">All users →</Link>}>
          <ul className="divide-y divide-[var(--rb-border-soft)]">
            {recent.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 py-2 hover:bg-[var(--rb-canvas)]">
                  <Avatar name={u.full_name} url={u.avatar_url} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{u.full_name || u.email || 'Unnamed'}</span>
                    <span className="block truncate text-xs text-[var(--rb-ink-3)]">{u.email}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {u.role ? <Badge>{u.role}</Badge> : null}
                    <span className="text-[11px] text-[var(--rb-ink-3)]">{ago(u.created_at, now)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
