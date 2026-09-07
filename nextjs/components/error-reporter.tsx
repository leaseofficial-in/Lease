'use client'

// Installs window-level error and unhandledrejection handlers.
//
// React error boundaries catch neither: an ErrorBoundary only sees errors thrown
// during render, so a rejected promise in an event handler or a failed background
// fetch would otherwise vanish silently. Mounted once from the root layout.

import { useEffect } from 'react'
import { installGlobalErrorReporting } from '@/lib/analytics/report-error'

export function ErrorReporter() {
  useEffect(() => {
    installGlobalErrorReporting()

    // Warm the Supabase chunk once, after the first sign of a real person.
    //
    // track() and reportError() import that client dynamically, which is what
    // keeps 60 KB of SDK off every marketing page. The one case that costs is an
    // event fired as the page is leaving -- the WhatsApp and SMS share links in
    // the invite modal are `<a>` elements, and a chunk that has not been fetched
    // yet may not arrive before the browser navigates. Fetching it on the first
    // interaction puts it in cache well before any of that, still off the
    // critical path, and never for a visitor who only scrolls and leaves.
    let warmed = false
    const warm = () => {
      if (warmed) return
      warmed = true
      void import('@/lib/supabase/client')
      for (const e of events) window.removeEventListener(e, warm)
    }
    const events = ['pointerdown', 'keydown', 'touchstart'] as const
    for (const e of events) window.addEventListener(e, warm, { once: false, passive: true })
    return () => { for (const e of events) window.removeEventListener(e, warm) }
  }, [])
  return null
}
