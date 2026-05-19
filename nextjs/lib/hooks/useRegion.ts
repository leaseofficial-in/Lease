'use client'

// ─── useRegion hook ───────────────────────────────────────────────────────────
// Reads the user's region from the rb_country cookie.
// Re-reads on mount so the server-rendered default is immediately replaced
// with the actual cookie value on the client.

import { useState, useEffect, useCallback } from 'react'
import { RegionConfig } from '@/lib/i18n/regions'
import { getRegionFromCookie, setRegionCookie } from '@/lib/region'
import type { CountryCode } from '@/lib/i18n/regions'

export function useRegion(): RegionConfig {
  const [region, setRegion] = useState<RegionConfig>(getRegionFromCookie)

  useEffect(() => {
    // Re-read after hydration — cookie may differ from SSR default
    setRegion(getRegionFromCookie())
  }, [])

  return region
}

/** Hook that also exposes a setter — used on the country-select page. */
export function useRegionControl(): [RegionConfig, (code: CountryCode) => void] {
  const [region, setRegionState] = useState<RegionConfig>(getRegionFromCookie)

  useEffect(() => {
    setRegionState(getRegionFromCookie())
  }, [])

  const setRegion = useCallback((code: CountryCode) => {
    setRegionCookie(code)
    // Lazily import to avoid circular deps
    import('@/lib/i18n/regions').then(({ REGIONS }) => {
      setRegionState(REGIONS[code])
    })
  }, [])

  return [region, setRegion]
}
