import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'

// ─── Resolve the caller of an API route ───────────────────────────────────────
//
// Two session transports reach the API:
//
//   - Web: the Supabase session lives in cookies, read by the SSR client.
//   - Native Android: the session lives in Capacitor Preferences, not cookies, so
//     the app sends `Authorization: Bearer <access_token>` instead.
//
// This was originally a private function inside app/api/email/welcome/route.ts.
// The second route that needed it copied nothing and instead got a reminder that
// the codebase already had the helper — so it now lives here, once.
//
// Returns the authenticated user, or null. Never trusts a user id from the body.

export async function getAuthedUser(req: Request) {
  const cookieClient = await createClient()
  const { data: cookieAuth } = await cookieClient.auth.getUser()
  if (cookieAuth.user) return { user: cookieAuth.user, client: cookieClient }

  const header = req.headers.get('authorization')
  const token = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null
  if (!token) return null

  // A fresh client with no cookie adapter, so it validates only this token — and,
  // with the token set as its auth header, its queries run as that user under RLS.
  const bearerClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  )
  const { data } = await bearerClient.auth.getUser(token)
  return data.user ? { user: data.user, client: bearerClient } : null
}
