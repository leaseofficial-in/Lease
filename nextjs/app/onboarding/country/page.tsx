'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { REGIONS, COUNTRY_PICKER_ORDER, getRegion } from '@/lib/i18n/regions'
import { setRegionCookie, getRegionFromCookie } from '@/lib/region'
import type { CountryCode } from '@/lib/i18n/regions'

export default function CountryOnboarding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [selected, setSelected] = useState<CountryCode>('IN')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // Pre-select from cookie (set by middleware from Vercel IP)
  useEffect(() => {
    const fromCookie = getRegionFromCookie()
    setSelected(fromCookie.countryCode)
  }, [])

  const filtered = COUNTRY_PICKER_ORDER.filter(code => {
    const r = REGIONS[code]
    return r.name.toLowerCase().includes(search.toLowerCase()) ||
      code.toLowerCase().includes(search.toLowerCase())
  })

  const handleConfirm = useCallback(async () => {
    setSaving(true)
    try {
      setRegionCookie(selected)
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        await sb.from('profiles').update({ country_code: selected }).eq('id', user.id)
      }
      router.replace(next.startsWith('/') ? next : '/dashboard')
    } catch {
      setSaving(false)
    }
  }, [selected, next, router])

  const selectedRegion = getRegion(selected)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--rb-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌍</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-.02em', color: 'var(--rb-ink)', margin: 0, marginBottom: 8 }}>
            Where are you based?
          </h1>
          <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', margin: 0, lineHeight: 1.6 }}>
            We&apos;ll set the right currency, payment methods, and local defaults for you.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search country…"
            style={{
              width: '100%',
              padding: '10px 14px',
              paddingLeft: 36,
              borderRadius: 10,
              border: '1.5px solid var(--rb-border)',
              background: 'var(--rb-surface)',
              color: 'var(--rb-ink)',
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--rb-ink-3)', fontSize: 14 }}>🔍</span>
        </div>

        {/* Country list */}
        <div style={{ border: '1.5px solid var(--rb-border)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          {filtered.map((code, i) => {
            const r = REGIONS[code]
            const isSelected = selected === code
            return (
              <button
                key={code}
                onClick={() => setSelected(code)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 16px',
                  background: isSelected ? 'var(--rb-action-soft, rgba(26,86,255,.08))' : 'var(--rb-surface)',
                  border: 'none',
                  borderTop: i > 0 ? '1px solid var(--rb-border-soft, rgba(0,0,0,.06))' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'background .12s',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{r.flag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? 'var(--rb-action)' : 'var(--rb-ink)' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 1 }}>{r.currency.symbol} {r.currency.name}</div>
                </div>
                {isSelected && (
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--rb-action)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 12 10" width="12" height="10" fill="none">
                      <path d="M1 5l3 3 7-7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--rb-ink-3)', fontSize: 14 }}>No countries match &ldquo;{search}&rdquo;</div>
          )}
        </div>

        {/* Selected preview */}
        {selectedRegion && (
          <div style={{ padding: '12px 16px', background: 'var(--rb-fill)', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{selectedRegion.flag}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rb-ink)' }}>{selectedRegion.name}</div>
              <div style={{ fontSize: 12, color: 'var(--rb-ink-3)' }}>
                {selectedRegion.currency.symbol} {selectedRegion.currency.name} · {selectedRegion.paymentMethods.slice(0, 3).join(', ')}
              </div>
            </div>
          </div>
        )}

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 999,
            background: 'var(--rb-action)',
            color: '#fff',
            border: 'none',
            cursor: saving ? 'default' : 'pointer',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 600,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : `Continue with ${selectedRegion?.name ?? selected} →`}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 16, lineHeight: 1.6 }}>
          You can change this later in your profile settings.
        </p>
      </div>
    </div>
  )
}
