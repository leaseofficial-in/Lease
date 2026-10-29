// ─── Welcome email ────────────────────────────────────────────────────────────
// Fired once, by whichever path finishes setting up the account: sign-up when it
// already knows the role (desktop chose one before Google, an invite implies
// tenant), or the dashboard's start screen when the person picks what to do.
//
// `keepalive` matters: callers often navigate immediately after, and without it
// the browser cancels the in-flight request. Fire-and-forget is deliberate -- a
// failed welcome email must never block sign-up (the route also swallows errors).
//
// The recipient is derived server-side from the session; only name and role are
// sent, and the bearer token is required by the native app, whose session lives
// in Capacitor Preferences rather than cookies.
export function sendWelcomeEmail(accessToken: string, name: string, role: string) {
  if (!name) return
  fetch('/api/email/welcome', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name, role }),
    keepalive: true,
  }).catch(() => {})
}

// The route rejects a blank name, and Google always supplies one, but the profile
// row may not have been populated yet on a first sign-in -- so fall back to the
// OAuth metadata.
export function welcomeName(profileName: string | null | undefined, session: { user: { user_metadata?: Record<string, unknown> } }): string {
  const meta = session.user.user_metadata || {}
  return (profileName || (meta.full_name as string) || (meta.name as string) || '').trim()
}
