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
  }, [])
  return null
}
