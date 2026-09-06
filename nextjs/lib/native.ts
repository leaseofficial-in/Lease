// ─── Native (Capacitor Android) detection ─────────────────────────────────────
//
// MainActivity injects a @JavascriptInterface as `window.__RentyBase` before any
// page JavaScript runs. That is the reliable signal: the Capacitor bridge itself
// can lag on a remote `server.url` and report "web" for the first paint.
//
// This function was defined identically in both the signin and signup pages. Two
// copies of a detection heuristic drift; one is the whole point of having it.
//
// Where it matters:
//   - Google sign-in: native account picker vs browser OAuth redirect.
//   - API calls: the native session lives in Capacitor Preferences, not cookies,
//     so routes are called with a bearer token (see lib/auth/authed-user.ts).

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  return typeof (window as unknown as { __RentyBase?: unknown }).__RentyBase !== 'undefined'
}
