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

// ─── The taxonomy has to match the product ────────────────────────────────────
//
// Five of the fourteen declared events had no call site anywhere: the whole
// retention half (payment_recorded, payment_confirmed, repair_raised,
// agreement_signed) plus rental_create_started -- the missing half of a
// *_started pair, at the step where landlords actually stall. A declared event
// with no caller is not a small tidiness problem: it is a funnel step the owner
// believes is being measured and is not.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full))
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

describe('event taxonomy', () => {
  const trackSource = readFileSync(join(APP_ROOT, 'lib', 'analytics', 'track.ts'), 'utf8')
  const declared = [...trackSource.matchAll(/^\s+\|\s+'([a-z_]+)'/gm)].map(m => m[1])

  const fired = new Set<string>()
  for (const dir of ['app', 'lib', 'components']) {
    for (const file of sourceFiles(join(APP_ROOT, dir))) {
      for (const m of readFileSync(file, 'utf8').matchAll(/\btrack\('([a-z_]+)'/g)) fired.add(m[1])
    }
  }

  it('declares the events it is supposed to', () => {
    expect(declared.length).toBe(14)
  })

  it('fires every event it declares', () => {
    expect(declared.filter(e => !fired.has(e))).toEqual([])
  })

  it('fires nothing it has not declared -- the CHECK constraint would reject it', () => {
    expect([...fired].filter(e => !declared.includes(e))).toEqual([])
  })
})
