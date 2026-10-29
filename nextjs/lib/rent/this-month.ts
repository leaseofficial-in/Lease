// ─── The owner's "This month" list ────────────────────────────────────────────
//
// The landlord's whole monthly job on one screen: every tenant, what they owe
// this month, and the one thing to do about it. Ordered by what needs doing:
// overdue first, paid last. Units without a tenant are listed separately, since
// their action is "add a tenant", not anything about money.

export type MonthStatus = 'overdue' | 'partial' | 'pending' | 'no_row' | 'pending_verification' | 'paid'

const RANK: Record<MonthStatus, number> = {
  overdue: 0, partial: 1, pending: 2, no_row: 3, pending_verification: 4, paid: 5,
}

interface RentalLike {
  id: string
  status: string
  tenant_id?: string | null
  tenant_name?: string | null
}

interface PaymentLike {
  rental_id: string
  status: string
}

export interface MonthRow<R, P> {
  rental: R
  payment: P | null
  status: MonthStatus
}

function statusOf(p: PaymentLike | null): MonthStatus {
  if (!p) return 'no_row'
  const s = p.status as MonthStatus
  return s in RANK ? s : 'pending'
}

export function thisMonth<R extends RentalLike, P extends PaymentLike>(rentals: R[], payments: P[]) {
  const live = rentals.filter((r) => r.status !== 'ended')
  const occupied = live.filter((r) => !!r.tenant_id || !!r.tenant_name)
  const rows: MonthRow<R, P>[] = occupied
    .map((rental) => {
      const payment = payments.find((p) => p.rental_id === rental.id) ?? null
      return { rental, payment, status: statusOf(payment) }
    })
    .sort((a, b) => RANK[a.status] - RANK[b.status])
  const vacant = live.filter((r) => !r.tenant_id && !r.tenant_name)
  const toCollect = rows.filter((r) => r.status === 'overdue' || r.status === 'partial' || r.status === 'pending').length
  return { rows, vacant, toCollect }
}
