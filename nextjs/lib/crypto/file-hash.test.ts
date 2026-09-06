import { describe, it, expect } from 'vitest'
import { sha256Hex } from './file-hash'

// These pin the digest against published SHA-256 test vectors, so a future change
// to the encoding (hex casing, byte order, padding) cannot silently alter what
// gets recorded against a tenant's move-in evidence. A hash column that quietly
// starts producing different values for the same bytes is worse than no column:
// it would make untouched photos look tampered with.

describe('sha256Hex', () => {
  it('matches the known digest of the empty input', async () => {
    const empty = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    expect(await sha256Hex(new Blob([]))).toBe(empty)
  })

  it('matches the known digest of "abc"', async () => {
    const abc = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    expect(await sha256Hex(new Blob(['abc']))).toBe(abc)
  })

  it('returns lowercase hex, zero-padded to 64 characters', async () => {
    const hash = await sha256Hex(new Blob(['rentybase']))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('gives the same digest for identical bytes from different Blobs', async () => {
    const a = await sha256Hex(new Blob(['move-in photo']))
    const b = await sha256Hex(new Blob(['move-in ', 'photo']))
    expect(a).toBe(b)
  })

  it('gives a different digest when a single byte changes', async () => {
    // The whole point: an altered file must not hash to the recorded value.
    const original = await sha256Hex(new Blob(['kitchen wall, no damage']))
    const altered = await sha256Hex(new Blob(['kitchen wall, no damagE']))
    expect(original).not.toBe(altered)
  })
})
