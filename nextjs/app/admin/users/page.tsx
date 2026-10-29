import Link from 'next/link'
import { getUsers } from '@/lib/admin/data'
import { activationStage, STAGE_ORDER, type Stage } from '@/lib/admin/activation'
import { ago, countryLabel, fmtDate } from '@/lib/admin/format'
import type { AdminUser } from '@/lib/admin/types'
import { Avatar, Badge, Card, DataTable, PageHeader, StageBadge, STAGE_META, type Column } from '@/components/admin/ui'

type Search = { q?: string; role?: string; stage?: string; country?: string; sort?: string }

const SORTS: Record<string, { label: string; cmp: (a: AdminUser, b: AdminUser) => number }> = {
  newest: { label: 'Newest', cmp: (a, b) => b.created_at.localeCompare(a.created_at) },
  active: { label: 'Recently active', cmp: (a, b) => (b.last_active_at ?? '').localeCompare(a.last_active_at ?? '') },
  rentals: { label: 'Most rentals', cmp: (a, b) => b.rentals + b.tenancies - (a.rentals + a.tenancies) },
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const users = await getUsers()
  const now = new Date()

  const q = (sp.q ?? '').trim().toLowerCase()
  const sort = SORTS[sp.sort ?? ''] ? sp.sort! : 'newest'
  const rows = users
    .map((u) => ({ ...u, stage: activationStage(u, now) }))
    .filter((u) =>
      (!q || [u.full_name, u.email, u.phone, u.id].some((v) => v?.toLowerCase().includes(q)))
      && (!sp.role || (sp.role === 'none' ? !u.role : u.role === sp.role))
      && (!sp.stage || u.stage === sp.stage)
      && (!sp.country || u.country_code === sp.country))
    .sort(SORTS[sort].cmp)

  const countries = [...new Set(users.map((u) => u.country_code).filter(Boolean))].sort() as string[]

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'user', header: 'User', cell: (u) => (
        <Link href={`/admin/users/${u.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
          <Avatar name={u.full_name} url={u.avatar_url} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{u.full_name || 'Unnamed'}{u.is_admin && <span className="ml-1.5"><Badge tone="accent">admin</Badge></span>}</span>
            <span className="block truncate text-xs text-[var(--rb-ink-3)]">{u.email || u.phone || '—'}</span>
          </span>
        </Link>
      ),
    },
    { key: 'role', header: 'Role', cell: (u) => u.role ? <Badge>{u.role}</Badge> : <span className="text-[var(--rb-ink-3)]">—</span> },
    { key: 'stage', header: 'Stage', cell: (u) => <StageBadge stage={u.stage} /> },
    { key: 'country', header: 'Country', cell: (u) => countryLabel(u.country_code) },
    {
      key: 'usage', header: 'Usage', cell: (u) => u.role === 'tenant'
        ? <span className="text-xs">{u.tenancies} rental{u.tenancies === 1 ? '' : 's'} · {u.tenant_paid_payments} paid</span>
        : <span className="text-xs">{u.properties} prop · {u.rentals} rent · {u.landlord_paid_payments} paid</span>,
    },
    { key: 'signup', header: 'Signed up', cell: (u) => <span title={fmtDate(u.created_at)}>{ago(u.created_at, now)}</span> },
    { key: 'active', header: 'Last active', cell: (u) => ago(u.last_active_at, now) },
    { key: 'provider', header: 'Sign-in', cell: (u) => <span className="text-xs text-[var(--rb-ink-3)]">{u.provider}</span>, desktopOnly: true },
  ]

  const select = 'h-9 rounded-full border border-[var(--rb-border-strong)] bg-[var(--rb-surface)] px-3 text-sm'

  return (
    <>
      <PageHeader title="Users" subtitle={`${rows.length} of ${users.length} accounts`} />

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          name="q" defaultValue={sp.q} placeholder="Search name, email, phone, id"
          className="h-9 min-w-0 flex-1 basis-56 rounded-full border border-[var(--rb-border-strong)] bg-[var(--rb-surface)] px-4 text-sm outline-none focus:border-[var(--rb-action)]"
        />
        <select name="role" defaultValue={sp.role ?? ''} className={select} aria-label="Role">
          <option value="">All roles</option>
          <option value="landlord">Landlords</option>
          <option value="tenant">Tenants</option>
          <option value="none">No role</option>
        </select>
        <select name="stage" defaultValue={sp.stage ?? ''} className={select} aria-label="Stage">
          <option value="">All stages</option>
          {STAGE_ORDER.map((s: Stage) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
        </select>
        <select name="country" defaultValue={sp.country ?? ''} className={select} aria-label="Country">
          <option value="">All countries</option>
          {countries.map((c) => <option key={c} value={c}>{countryLabel(c)}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className={select} aria-label="Sort">
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-full bg-[var(--rb-action)] px-4 text-sm font-medium text-white hover:bg-[var(--rb-action-hover)]">Apply</button>
        {(sp.q || sp.role || sp.stage || sp.country) && (
          <Link href="/admin/users" className="flex h-9 items-center px-2 text-sm text-[var(--rb-ink-3)] hover:underline">Clear</Link>
        )}
      </form>

      <Card>
        <DataTable rows={rows} columns={columns} rowKey={(u) => u.id} empty="No users match these filters." />
      </Card>
    </>
  )
}
