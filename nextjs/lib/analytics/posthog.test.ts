import { describe, it, expect } from 'vitest'
import { scrubUrl } from './posthog'

describe('scrubUrl', () => {
  it('removes invite and rent-link tokens from paths', () => {
    expect(scrubUrl('https://rentybase.com/join/a1b2c3d4e5')).toBe('https://rentybase.com/join/[token]')
    expect(scrubUrl('https://rentybase.com/rent/0123456789abcdef0123456789abcdef?x=1')).toBe('https://rentybase.com/rent/[token]?x=1')
  })

  it('removes ids and auth parameters', () => {
    expect(scrubUrl('/admin/users/073f1b61-9245-44e2-86c6-6462541fb98b')).toBe('/admin/users/[id]')
    expect(scrubUrl('/auth/callback?code=abc123&next=%2Fjoin%2Fxyz')).toBe('/auth/callback?code=[redacted]&next=[redacted]')
  })

  it('leaves ordinary URLs alone', () => {
    expect(scrubUrl('https://rentybase.com/pricing?utm_source=google')).toBe('https://rentybase.com/pricing?utm_source=google')
  })
})
