'use client'

import { useState, useTransition } from 'react'
import { revealPayoutAction } from '@/app/admin/actions'

export function RevealPayout({ userId }: { userId: string }) {
  const [data, setData] = useState<{ upi_id: string | null; payout_details: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (data) {
    return (
      <div className="space-y-1 text-left text-sm">
        <div><span className="text-[var(--rb-ink-3)]">UPI: </span>{data.upi_id || '—'}</div>
        <div className="whitespace-pre-wrap"><span className="text-[var(--rb-ink-3)]">Payout: </span>{data.payout_details || '—'}</div>
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          try {
            setData((await revealPayoutAction(userId)) ?? { upi_id: null, payout_details: null })
          } catch {
            setError('Could not load')
          }
        })}
        className="rounded-full border border-[var(--rb-border-strong)] px-3 py-1 text-xs font-medium text-[var(--rb-ink-2)] hover:bg-[var(--rb-fill)] disabled:opacity-50"
      >
        {pending ? 'Loading…' : 'Reveal (logged)'}
      </button>
      {error && <span className="text-xs text-[var(--rb-danger)]">{error}</span>}
    </span>
  )
}
