import { PostHog } from 'posthog-node'

// ─── Server-side PostHog ──────────────────────────────────────────────────────
//
// For things only the server sees: an email that actually went out, a reminder
// the cron job sent. A fresh client per call, flushed before the request ends:
// Vercel functions are frozen as soon as they respond, so a batched client would
// drop whatever it had queued.

const TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const MISSING =
  'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured'

export interface ServerEvent {
  /** The account the event belongs to: the same id the browser identifies with. */
  distinctId: string
  event: string
  properties?: Record<string, string | number | boolean | null>
}

/** Send events and wait for delivery. Never throws: analytics must not fail a request. */
export async function captureServer(events: ServerEvent[]): Promise<void> {
  if (events.length === 0) return
  if (!TOKEN) {
    if (process.env.NODE_ENV !== 'production') console.error(new Error(MISSING))
    return
  }
  const client = new PostHog(TOKEN, { host: 'https://us.i.posthog.com', flushAt: 1, flushInterval: 0 })
  try {
    for (const e of events) client.capture({ distinctId: e.distinctId, event: e.event, properties: e.properties })
    await client.shutdown()
  } catch {
    // Intentionally silent.
  }
}
