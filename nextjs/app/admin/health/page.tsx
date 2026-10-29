import Link from 'next/link'
import { getHealth } from '@/lib/admin/data'
import { ago, fmtDate, fmtDateTime } from '@/lib/admin/format'
import { Card, Empty, MiniBars, PageHeader, StatusBadge } from '@/components/admin/ui'

export default async function AdminHealthPage() {
  const h = await getHealth()
  const now = new Date()

  // email_type → { sent, failed, skipped }
  const emailTypes = new Map<string, Record<string, number>>()
  for (const r of h.email_summary) {
    const row = emailTypes.get(r.email_type) ?? {}
    row[r.status] = r.count
    emailTypes.set(r.email_type, row)
  }

  return (
    <>
      <PageHeader title="Health" subtitle="App errors, email delivery, background jobs. Last 7 days unless noted." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="App errors per day (14 days)" className="lg:col-span-2">
          <MiniBars label="Client errors per day" data={h.errors_by_day.map((d) => ({ key: d.day, value: d.count, title: fmtDate(d.day) }))} />
        </Card>

        <Card title="Scheduled jobs">
          {h.cron === null ? <Empty>pg_cron history is not readable.</Empty> : h.cron.length === 0 ? <Empty>No cron jobs.</Empty> : (
            <ul className="divide-y divide-[var(--rb-border-soft)]">
              {h.cron.map((j) => (
                <li key={j.jobname} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{j.jobname}</span>
                    {j.active ? <StatusBadge status={j.last_status ?? 'never run'} /> : <StatusBadge status="paused" />}
                  </div>
                  <div className="text-xs text-[var(--rb-ink-3)]">
                    <code>{j.schedule}</code> · last {ago(j.last_run_at, now)}
                    {j.failed_7d > 0 && <span className="text-[var(--rb-danger)]"> · {j.failed_7d} failed</span>}
                  </div>
                  {j.last_status === 'failed' && j.last_message && <div className="mt-1 break-words text-xs text-[var(--rb-danger)]">{j.last_message}</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title={`Top app errors (${h.error_groups.length})`} className="mt-4">
        {h.error_groups.length === 0 ? <Empty>No client errors this week.</Empty> : (
          <ul className="divide-y divide-[var(--rb-border-soft)]">
            {h.error_groups.map((e, i) => (
              <li key={i} className="flex items-start justify-between gap-4 py-2 text-sm">
                <span className="min-w-0">
                  <span className="line-clamp-2 break-words">{e.message}</span>
                  <span className="text-xs text-[var(--rb-ink-3)]">{e.context ?? 'no context'} · last {ago(e.last_seen, now)}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <b>{e.count}×</b>
                  <span className="block text-xs text-[var(--rb-ink-3)]">{e.users} user{e.users === 1 ? '' : 's'}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Email delivery">
          {emailTypes.size === 0 ? <Empty>No emails this week.</Empty> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-[var(--rb-ink-3)]"><th className="py-1 font-medium">Type</th><th className="py-1 text-right font-medium">Sent</th><th className="py-1 text-right font-medium">Skipped</th><th className="py-1 text-right font-medium">Failed</th></tr></thead>
              <tbody>
                {[...emailTypes].map(([type, s]) => (
                  <tr key={type} className="border-t border-[var(--rb-border-soft)]">
                    <td className="py-1.5">{type.replace(/_/g, ' ')}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.sent ?? 0}</td>
                    <td className="py-1.5 text-right tabular-nums text-[var(--rb-ink-3)]">{s.skipped ?? 0}</td>
                    <td className={`py-1.5 text-right tabular-nums ${s.failed ? 'font-semibold text-[var(--rb-danger)]' : ''}`}>{s.failed ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Recent email problems">
          {h.email_problems.length === 0 ? <Empty>No failed or skipped emails.</Empty> : (
            <ul className="max-h-[360px] divide-y divide-[var(--rb-border-soft)] overflow-y-auto">
              {h.email_problems.map((e, i) => (
                <li key={i} className="py-1.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{e.email_type.replace(/_/g, ' ')}</span>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="text-xs text-[var(--rb-ink-3)]">
                    {fmtDateTime(e.created_at)} · {e.skip_reason ?? e.error ?? '—'}
                    {e.recipient_id && <> · <Link href={`/admin/users/${e.recipient_id}`} className="text-[var(--rb-action)] hover:underline">user</Link></>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="AI agents" className="mt-4">
        {h.agent_summary.length === 0 && h.agent_failures.length === 0 ? <Empty>No agent runs this week.</Empty> : (
          <div className="grid gap-4 md:grid-cols-2">
            <ul className="divide-y divide-[var(--rb-border-soft)]">
              {h.agent_summary.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span>{a.agent_type.replace(/_/g, ' ')} <StatusBadge status={a.status} /></span>
                  <span className="tabular-nums">{a.count} <span className="text-xs text-[var(--rb-ink-3)]">· {ago(a.last_at, now)}</span></span>
                </li>
              ))}
            </ul>
            <ul className="divide-y divide-[var(--rb-border-soft)]">
              {h.agent_failures.length === 0 ? <Empty>No failures.</Empty> : h.agent_failures.map((a, i) => (
                <li key={i} className="py-1.5 text-sm">
                  <div className="font-medium">{a.agent_type.replace(/_/g, ' ')}</div>
                  <div className="break-words text-xs text-[var(--rb-danger)]">{a.error ?? 'no message'}</div>
                  <div className="text-xs text-[var(--rb-ink-3)]">{fmtDateTime(a.created_at)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </>
  )
}
