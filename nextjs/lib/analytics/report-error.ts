'use client'

// ─── Client error reporting ───────────────────────────────────────────────────
//
// There is no Sentry, and a console.error inside a user's browser reaches nobody.
// This is the smallest thing that answers "is the app throwing for real users",
// built on the stack already in place rather than adding a vendor.
//
// Explicitly a stopgap: no grouping, no release tracking, no source maps, so a
// minified stack is of limited use. It is still the difference between zero
// visibility and some, and it is enough to notice that something started throwing.
// Swap it for a real tracker once there is volume to justify one.

import { createClient } from '@/lib/supabase/client'

// A page's route PATTERN, never its live URL. `/join/ABC123` would put a live
// invite token in the log and `/dashboard?rental=<uuid>` would turn this into a
// record of who looked at what — neither belongs in an error report.
function routePattern(): string {
  if (typeof window === 'undefined') return 'server'
  const path = window.location.pathname
  return path
    .replace(/\/join\/[^/]+/, '/join/[token]')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
    .slice(0, 120)
}

// The same error firing in a render loop must not turn into thousands of rows.
// Keyed by message + context and remembered for the life of the page.
const alreadyReported = new Set<string>()
const MAX_PER_PAGE = 10

export function reportError(error: unknown, context?: string): void {
  if (typeof window === 'undefined') return

  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
  const stack = error instanceof Error ? error.stack : undefined
  const where = context || routePattern()

  const key = `${where}::${message}`
  if (alreadyReported.has(key) || alreadyReported.size >= MAX_PER_PAGE) return
  alreadyReported.add(key)

  void (async () => {
    try {
      const sb = createClient()
      const { data } = await sb.auth.getSession()
      await sb.from('client_errors').insert({
        user_id: data.session?.user?.id ?? null,
        // Column limits are enforced by CHECK constraints; truncate here so a long
        // message is recorded rather than rejected outright.
        message: message.slice(0, 500),
        context: where,
        stack: stack ? stack.slice(0, 4000) : null,
      })
    } catch {
      // Reporting a failure must never itself fail loudly.
    }
  })()
}

/**
 * Attach global handlers for errors that escape React entirely — an async
 * rejection, an event handler that throws. An ErrorBoundary catches neither.
 */
export function installGlobalErrorReporting(): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as { __rbErrorHandlersInstalled?: boolean }
  if (w.__rbErrorHandlersInstalled) return
  w.__rbErrorHandlersInstalled = true

  window.addEventListener('error', event => {
    reportError(event.error ?? event.message, routePattern())
  })
  window.addEventListener('unhandledrejection', event => {
    reportError(event.reason, routePattern())
  })
}
