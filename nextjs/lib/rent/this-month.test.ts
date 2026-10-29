import { describe, it, expect } from 'vitest'
import { thisMonth } from './this-month'

const r = (id: string, over: Partial<{ status: string; tenant_id: string | null; tenant_name: string | null }> = {}) =>
  ({ id, status: 'active', tenant_id: null, tenant_name: 'T', ...over })
const p = (rental_id: string, status: string) => ({ rental_id, status })

describe('thisMonth', () => {
  it('orders by what needs doing: overdue first, paid last', () => {
    const { rows } = thisMonth(
      [r('a'), r('b'), r('c'), r('d'), r('e')],
      [p('a', 'paid'), p('b', 'pending'), p('c', 'overdue'), p('d', 'pending_verification')],
    )
    expect(rows.map((x) => `${x.rental.id}:${x.status}`)).toEqual(['c:overdue', 'b:pending', 'e:no_row', 'd:pending_verification', 'a:paid'])
  })

  it('lists units without a tenant separately and drops ended rentals', () => {
    const { rows, vacant } = thisMonth(
      [r('a', { tenant_name: null }), r('b', { status: 'ended' }), r('c', { tenant_name: null, tenant_id: 'u1' })],
      [],
    )
    expect(vacant.map((x) => x.id)).toEqual(['a'])
    expect(rows.map((x) => x.rental.id)).toEqual(['c'])
  })

  it('counts only rent still owed as to collect', () => {
    const { toCollect } = thisMonth([r('a'), r('b'), r('c')], [p('a', 'overdue'), p('b', 'partial'), p('c', 'paid')])
    expect(toCollect).toBe(2)
  })

  it('treats an unknown payment status as pending rather than hiding it', () => {
    const { rows } = thisMonth([r('a')], [p('a', 'something_new')])
    expect(rows[0].status).toBe('pending')
  })
})
