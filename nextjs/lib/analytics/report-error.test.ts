import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// client_errors has recorded zero rows. Like product_events, the reporter had only
// been verified as present in the bundle. This pins the insert shape and the two
// behaviours that matter for a log that real browsers write to: PII-free context
// (route patterns, never live URLs) and dedup so a render loop cannot flood it.

const insert = vi.fn()
const from = vi.fn(() => ({ insert }))
const getSession = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from, auth: { getSession } }),
}))

function stubWindow(pathname: string) {
  vi.stubGlobal('window', { location: { pathname }, addEventListener: vi.fn() })
}

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null })
  from.mockClear()
  getSession.mockReset().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
  vi.resetModules()
})
afterEach(() => vi.unstubAllGlobals())

const flush = () => new Promise(r => setTimeout(r, 0))

describe('reportError', () => {
  it('writes message, stack and a route PATTERN to client_errors', async () => {
    stubWindow('/dashboard')
    const { reportError } = await import('./report-error')
    reportError(new Error('boom'), 'app/error')
    await flush()
    expect(from).toHaveBeenCalledWith('client_errors')
    const row = insert.mock.calls[0][0]
    expect(row).toMatchObject({ user_id: 'u1', message: 'boom', context: 'app/error' })
    expect(typeof row.stack).toBe('string')
  })

  it('never records a live invite token or a row id in the context', async () => {
    // /join/ABC123 would put a working credential in the error log.
    stubWindow('/join/K7MN3PQ2WX')
    const { reportError } = await import('./report-error')
    reportError(new Error('x'))
    await flush()
    expect(insert.mock.calls[0][0].context).toBe('/join/[token]')

    vi.resetModules(); insert.mockClear()
    stubWindow('/dashboard/7f3a2b1c-4d5e-4f60-8a9b-0c1d2e3f4a5b')
    const { reportError: r2 } = await import('./report-error')
    r2(new Error('y'))
    await flush()
    expect(insert.mock.calls[0][0].context).toBe('/dashboard/[id]')
  })

  it('dedups the same error on the same page', async () => {
    stubWindow('/dashboard')
    const { reportError } = await import('./report-error')
    reportError(new Error('same'))
    reportError(new Error('same'))
    reportError(new Error('same'))
    await flush()
    expect(insert).toHaveBeenCalledTimes(1)
  })

  it('caps reports per page so a render loop cannot flood the table', async () => {
    stubWindow('/dashboard')
    const { reportError } = await import('./report-error')
    for (let i = 0; i < 25; i++) reportError(new Error(`distinct ${i}`))
    await flush()
    expect(insert.mock.calls.length).toBeLessThanOrEqual(10)
  })

  it('truncates an oversized message rather than letting the CHECK constraint reject it', async () => {
    stubWindow('/dashboard')
    const { reportError } = await import('./report-error')
    reportError(new Error('m'.repeat(2000)))
    await flush()
    expect(insert.mock.calls[0][0].message.length).toBe(500)
  })

  it('accepts non-Error values and never throws', async () => {
    stubWindow('/dashboard')
    const { reportError } = await import('./report-error')
    expect(() => reportError('a string')).not.toThrow()
    expect(() => reportError(null)).not.toThrow()
    await flush()
    expect(insert.mock.calls[0][0].message).toBe('a string')
  })
})
