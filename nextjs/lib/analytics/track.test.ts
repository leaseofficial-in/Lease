import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// product_events has recorded zero rows since it shipped. That is consistent with
// zero traffic, but the tracking code has only ever been verified as PRESENT in the
// bundle, never observed producing a row. This pins the one thing that can be
// checked without a browser: that a track() call becomes an insert into the right
// table with the right shape, attributed to the session user (or null), and that
// a failing insert never escapes to the caller.

const insert = vi.fn()
const from = vi.fn(() => ({ insert }))
const getSession = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from, auth: { getSession } }),
}))

// track() bails out when window is undefined, so give it one.
beforeEach(() => {
  vi.stubGlobal('window', {})
  insert.mockReset().mockResolvedValue({ error: null })
  from.mockClear()
  getSession.mockReset()
})
afterEach(() => vi.unstubAllGlobals())

const flush = () => new Promise(r => setTimeout(r, 0))

describe('track', () => {
  it('inserts into product_events with the event, props and the session user id', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } } })
    const { track } = await import('./track')
    track('property_created', { flow: 'standalone' })
    await flush()
    expect(from).toHaveBeenCalledWith('product_events')
    expect(insert).toHaveBeenCalledWith({ event: 'property_created', props: { flow: 'standalone' }, user_id: 'user-123' })
  })

  it('records an anonymous event with user_id null when there is no session', async () => {
    // The invite screen is opened by people with no account yet — the visit worth
    // counting most. RLS requires user_id to be null in that case, not omitted.
    getSession.mockResolvedValue({ data: { session: null } })
    const { track } = await import('./track')
    track('invite_opened', { state: 'preview' })
    await flush()
    expect(insert).toHaveBeenCalledWith({ event: 'invite_opened', props: { state: 'preview' }, user_id: null })
  })

  it('defaults props to an empty object', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    const { track } = await import('./track')
    track('invite_regenerated')
    await flush()
    expect(insert.mock.calls[0][0]).toMatchObject({ event: 'invite_regenerated', props: {} })
  })

  it('never throws to the caller when the insert fails', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    insert.mockRejectedValue(new Error('network down'))
    const { track } = await import('./track')
    expect(() => track('signup_started', { role: 'landlord' })).not.toThrow()
    await flush()
  })

  it('is a no-op on the server', async () => {
    vi.stubGlobal('window', undefined)
    const { track } = await import('./track')
    track('signup_started')
    await flush()
    expect(from).not.toHaveBeenCalled()
  })
})
