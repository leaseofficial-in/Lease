import Link from 'next/link'
import { getUsers } from '@/lib/admin/data'
import { activationStage, funnel, LANDLORD_FUNNEL, stepFor, TENANT_FUNNEL, type Step } from '@/lib/admin/activation'
import { ago } from '@/lib/admin/format'
import type { AdminUser } from '@/lib/admin/types'
import { Avatar, Card, Empty, PageHeader, StageBadge } from '@/components/admin/ui'

const NEXT_STEP: Record<Step, string> = {
  signed_up: 'Add a first property',
  property: 'Create a rental',
  rental: 'Invite or track a tenant',
  tenant: 'Record the first rent payment',
  paid: '—',
}

export default async function AdminInsightsPage() {
  const users = await getUsers()
  const now = new Date()

  const landlords = users.filter((u) => u.role === 'landlord')
  const tenants = users.filter((u) => u.role === 'tenant')
  const withStage = users.map((u) => ({ ...u, stage: activationStage(u, now) }))

  // Who to nudge: landlords stuck or almost there, longest-waiting first.
  const nudge = withStage
    .filter((u) => u.role === 'landlord' && (u.stage === 'stuck' || u.stage === 'almost_there'))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const noRole = withStage.filter((u) => u.stage === 'onboarding')
  const dormant = withStage.filter((u) => u.stage === 'dormant')

  return (
    <>
      <PageHeader title="Insights" subtitle="Where users get to, and where they stop. Worked out from real rows, so it covers users from before tracking existed." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Landlord funnel (${landlords.length})`}><Funnel users={landlords} steps={LANDLORD_FUNNEL} /></Card>
        <Card title={`Tenant funnel (${tenants.length})`}><Funnel users={tenants} steps={TENANT_FUNNEL} /></Card>
      </div>

      <Card title={`Landlords to nudge (${nudge.length})`} className="mt-4">
        {nudge.length === 0 ? <Empty>Nobody is stuck right now.</Empty> : (
          <ul className="divide-y divide-[var(--rb-border-soft)]">
            {nudge.map((u) => <PersonRow key={u.id} u={u} stage={u.stage} note={`Next: ${NEXT_STEP[stepFor(u)]}`} now={now} />)}
          </ul>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={`Never picked a role (${noRole.length})`}>
          {noRole.length === 0 ? <Empty>Everyone finished signup.</Empty> : (
            <ul className="divide-y divide-[var(--rb-border-soft)]">
              {noRole.map((u) => <PersonRow key={u.id} u={u} stage={u.stage} note="Abandoned at the role screen" now={now} />)}
            </ul>
          )}
        </Card>
        <Card title={`Dormant (${dormant.length})`}>
          {dormant.length === 0 ? <Empty>No activated user has gone quiet.</Empty> : (
            <ul className="divide-y divide-[var(--rb-border-soft)]">
              {dormant.map((u) => <PersonRow key={u.id} u={u} stage={u.stage} note={`Last active ${ago(u.last_active_at, now)}`} now={now} />)}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

function Funnel({ users, steps }: { users: AdminUser[]; steps: { step: Step; label: string }[] }) {
  const rows = funnel(users, steps)
  const top = Math.max(1, rows[0]?.count ?? 0)
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => {
        const prev = i === 0 ? null : rows[i - 1].count
        const conv = prev ? Math.round((r.count / prev) * 100) : null
        return (
          <li key={r.step}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>{r.label}</span>
              <span className="tabular-nums">
                <b>{r.count}</b>
                {conv !== null && <span className={`ml-2 text-xs ${conv < 50 ? 'text-[var(--rb-danger)]' : 'text-[var(--rb-ink-3)]'}`}>{conv}% of previous</span>}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--rb-fill)]">
              <div className="h-full rounded-full bg-[var(--rb-action)]" style={{ width: `${(r.count / top) * 100}%` }} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function PersonRow({ u, stage, note, now }: { u: AdminUser; stage: ReturnType<typeof activationStage>; note: string; now: Date }) {
  return (
    <li>
      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 py-2 hover:bg-[var(--rb-canvas)]">
        <Avatar name={u.full_name} url={u.avatar_url} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{u.full_name || u.email || 'Unnamed'}</span>
          <span className="block truncate text-xs text-[var(--rb-ink-3)]">{note} · {u.email ?? u.phone ?? ''}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <StageBadge stage={stage} />
          <span className="text-[11px] text-[var(--rb-ink-3)]">joined {ago(u.created_at, now)}</span>
        </span>
      </Link>
    </li>
  )
}
