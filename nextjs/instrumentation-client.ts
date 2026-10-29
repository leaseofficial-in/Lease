// Runs in the browser before the app hydrates, on every page. Kept to a timer:
// the PostHog SDK itself is fetched later, once the page is idle (see
// lib/analytics/posthog.ts for why).
import { loadPosthogWhenIdle } from '@/lib/analytics/posthog'

loadPosthogWhenIdle()
