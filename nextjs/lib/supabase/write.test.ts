import { describe, it, expect } from 'vitest'
import { assertAffected } from './write'
import type { PostgrestError } from '@supabase/supabase-js'

// The one behaviour that matters: a write that matched zero rows is a FAILURE,
// even though supabase-js hands it back with error: null. That shape hid a broken
// "Reject payment" button behind a green toast, and would hide any future RLS
// mistake the same way.

const pgError = (message: string): PostgrestError =>
  ({ message, details: '', hint: '', code: '42501', name: 'PostgrestError' }) as PostgrestError

describe('assertAffected', () => {
  it('returns the rows when at least one was affected', () => {
    const rows = assertAffected({ data: [{ id: 'a' }], error: null }, 'rental')
    expect(rows).toEqual([{ id: 'a' }])
  })

  it('throws on a real database error, preserving it', () => {
    const err = pgError('permission denied')
    expect(() => assertAffected({ data: null, error: err }, 'rental')).toThrow(err)
  })

  it('throws when zero rows were affected — the silent-failure case', () => {
    // error is null. Before this helper existed every call site treated this as
    // success.
    expect(() => assertAffected({ data: [], error: null }, 'payment')).toThrow(/payment could not be saved/)
    expect(() => assertAffected({ data: null, error: null }, 'payment')).toThrow(/payment could not be saved/)
  })

  it('names the thing in the message so the user knows what did not save', () => {
    expect(() => assertAffected({ data: [], error: null }, 'repair request')).toThrow(/repair request/)
  })

  it('tells the user something they can act on', () => {
    expect(() => assertAffected({ data: [], error: null }, 'lease')).toThrow(/refresh and try again/)
  })
})
