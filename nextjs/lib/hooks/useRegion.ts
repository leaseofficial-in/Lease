'use client'

// ─── useRegion hook ───────────────────────────────────────────────────────────
// Reads the viewer's region from the rb_country cookie.
//
// This used to be useState(getRegionFromCookie) followed by a useEffect that read
// the cookie again and called setState — the standard "fix hydration by
// re-rendering" pattern. It works, but it is a cascading render on every mount
// and it papers over the real problem: the cookie is an EXTERNAL store, and React
// has an API for those.
//
// useSyncExternalStore gives the server a stable snapshot ('IN', the SSR default),
// gives the client the cookie value on first render, and re-renders subscribers
// when the country is changed in-app — without the double render and without a
// hydration mismatch, because React reconciles the two snapshots for us.
//
// The snapshot is the two-letter CODE, a primitive, so React's Object.is
// comparison is stable. The RegionConfig object is derived from it afterwards.

import { useSyncExternalStore, useCallback } from 'react'
import { getRegion, type RegionConfig, type CountryCode } from '@/lib/i18n/regions'
import { getCountryFromCookie, setRegionCookie } from '@/lib/region'

// Cookies emit no change event, so in-app changes are broadcast here. Only
// setRegion below writes the cookie, so this is the single source of change.
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getSnapshot(): string {
  return getCountryFromCookie()
}

// What the server renders, and what the client renders on its FIRST pass so that
// hydration matches. React then re-renders with getSnapshot() if it differs.
function getServerSnapshot(): string {
  return 'IN'
}

export function useRegion(): RegionConfig {
  const code = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return getRegion(code)
}

/** Hook that also exposes a setter — used on the country-select page. */
export function useRegionControl(): [RegionConfig, (code: CountryCode) => void] {
  const region = useRegion()
  const setRegion = useCallback((next: CountryCode) => {
    setRegionCookie(next)
    for (const l of listeners) l()
  }, [])
  return [region, setRegion]
}
