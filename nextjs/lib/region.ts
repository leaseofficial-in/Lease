// ─── Region utilities for Next.js (client + server safe) ─────────────────────
// Cookie name: rb_country  — holds the ISO 3166-1 alpha-2 country code.
// Written by middleware on first visit (from Vercel IP header) and by the
// country-select page when the user explicitly chooses.

import { CountryCode, RegionConfig, REGIONS, getRegion } from '@/lib/i18n/regions'

export const REGION_COOKIE = 'rb_country'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

// ─── Client-side helpers ──────────────────────────────────────────────────────

/** Read the current region from the browser cookie. Safe to call during SSR — returns India default. */
export function getRegionFromCookie(): RegionConfig {
  if (typeof document === 'undefined') return REGIONS['IN']
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REGION_COOKIE}=([^;]+)`))
  return getRegion(match?.[1])
}

/** Get the CountryCode from the browser cookie. */
export function getCountryFromCookie(): CountryCode {
  return getRegionFromCookie().countryCode
}

/** Persist a country choice to the browser cookie. */
export function setRegionCookie(code: CountryCode): void {
  if (typeof document === 'undefined') return
  document.cookie = `${REGION_COOKIE}=${code}; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`
}
