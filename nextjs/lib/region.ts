// ─── Region utilities for Next.js (client + server safe) ─────────────────────
// Cookie name: rb_country  — holds the ISO 3166-1 alpha-2 country code.
// Written by middleware on first visit (from Vercel IP header) and by the
// country-select page when the user explicitly chooses.

import { RegionConfig, REGIONS, getRegion } from '@/lib/i18n/regions'

export const REGION_COOKIE = 'rb_country'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

// ─── Client-side helpers ──────────────────────────────────────────────────────

/** Read the current region from the browser cookie. Safe to call during SSR — returns India default. */
export function getRegionFromCookie(): RegionConfig {
  if (typeof document === 'undefined') return REGIONS['IN']
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REGION_COOKIE}=([^;]+)`))
  return getRegion(match?.[1])
}

/** Get the ISO country code from the browser cookie. */
export function getCountryFromCookie(): string {
  return getRegionFromCookie().countryCode
}

/** Persist a country choice to the browser cookie. */
export function setRegionCookie(code: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${REGION_COOKIE}=${code}; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`
}

/**
 * The user's real IANA zone from the browser, else the region's fallback.
 *
 * A region's primaryTimezone is one zone per country, which is wrong for most
 * of the US, Canada, Australia, Brazil, Russia, Mexico, Indonesia... and is
 * only 'UTC' for countries without a curated entry. profiles.timezone decides
 * which calendar day the overdue and reminder jobs judge a tenant by, so the
 * device's own zone is the better value whenever we have one.
 */
export function browserTimezone(fallback: string): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) {
      new Intl.DateTimeFormat('en', { timeZone: tz }) // throws on an invalid name
      return tz
    }
  } catch { /* fall through */ }
  return fallback
}
