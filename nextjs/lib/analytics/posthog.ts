'use client'

import type { PostHog, CaptureResult } from 'posthog-js'

// ─── PostHog, loaded late ─────────────────────────────────────────────────────
//
// posthog-js is ~50 KB gzipped. Imported statically from instrumentation-client
// it would land in the first load of every marketing and SEO page -- the same
// cost lib/analytics/track.ts removed for Supabase. So it is imported only once
// the page has loaded and the browser is idle; track() calls made before then
// wait on the same promise, so nothing is dropped.
//
// Events go to /ingest on our own domain (a rewrite in next.config.ts), which
// keeps them out of reach of tracker blockers and inside the CSP's 'self'.

const TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const MISSING =
  'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured'

// Invite and rent links carry the secret that opens them, and the Referrer-Policy
// already keeps them from leaking to third parties. Same rule here: a URL is
// recorded by its shape, never with the token in it.
export function scrubUrl(url: string): string {
  return url
    .replace(/\/join\/[^/?#]+/g, '/join/[token]')
    .replace(/\/rent\/[^/?#]+/g, '/rent/[token]')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
    .replace(/([?&](?:code|token|access_token|refresh_token|next)=)[^&#]*/gi, '$1[redacted]')
}

const URL_PROPS = ['$current_url', '$pathname', '$referrer', '$initial_current_url', '$initial_referrer', '$prev_pageview_pathname']

function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event
  for (const bag of [event.properties, event.$set, event.$set_once] as (Record<string, unknown> | undefined)[]) {
    if (!bag) continue
    for (const k of URL_PROPS) if (typeof bag[k] === 'string') bag[k] = scrubUrl(bag[k] as string)
  }
  return event
}

let loading: Promise<PostHog | null> | null = null

/** The initialised client, or null when PostHog is not configured. Never rejects. */
export function getPosthog(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!loading) {
    loading = (async () => {
      if (!TOKEN) {
        if (process.env.NODE_ENV !== 'production') console.error(new Error(MISSING))
        return null
      }
      try {
        const { default: posthog } = await import('posthog-js')
        posthog.init(TOKEN, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest',
          ui_host: 'https://us.posthog.com',
          defaults: '2026-05-30',
          person_profiles: 'identified_only',
          before_send: scrubEvent,
        })
        return posthog
      } catch {
        return null
      }
    })()
  }
  return loading
}

/** Start loading after the page is interactive. Called from instrumentation-client. */
export function loadPosthogWhenIdle(): void {
  if (typeof window === 'undefined') return
  const start = () => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
    if (idle) idle(() => void getPosthog())
    else setTimeout(() => void getPosthog(), 1500)
  }
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}

/**
 * Link this browser to the account. The id only: names, emails and phone numbers
 * stay out of analytics, the same rule product_events follows.
 */
export function identifyUser(userId: string, props: Record<string, string | boolean | null>, isPlatformAdmin = false): void {
  void getPosthog().then((ph) => {
    if (!ph) return
    // The operator's own clicks would be a large share of a small user base.
    if (isPlatformAdmin) { ph.opt_out_capturing(); return }
    if (ph.has_opted_out_capturing()) ph.opt_in_capturing()
    ph.identify(userId, props)
  })
}

/** On sign-out, so the next person on this browser is not merged into the last. */
export function resetUser(): void {
  void getPosthog().then((ph) => ph?.reset())
}
