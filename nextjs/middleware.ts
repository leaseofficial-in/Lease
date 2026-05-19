// ─── Middleware: country detection ────────────────────────────────────────────
// Runs on every request before the page renders.
// Sets rb_country cookie if not already present using:
//   1. Vercel's x-vercel-ip-country header (accurate in production)
//   2. Accept-Language header (fallback for local dev)
//   3. 'IN' default (preserves existing India user experience)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { REGION_COOKIE } from '@/lib/region'
import { REGIONS } from '@/lib/i18n/regions'

// Only valid country codes we support
const SUPPORTED = new Set(Object.keys(REGIONS))

function detectFromHeaders(req: NextRequest): string {
  // 1. Vercel sets this on deployed instances
  const vercelCountry = req.headers.get('x-vercel-ip-country')
  if (vercelCountry && SUPPORTED.has(vercelCountry)) return vercelCountry

  // 2. Accept-Language: e.g. "en-US,en;q=0.9" → "US"
  const acceptLang = req.headers.get('accept-language') ?? ''
  const match = acceptLang.match(/[a-z]{2}-([A-Z]{2})/)
  if (match?.[1] && SUPPORTED.has(match[1])) return match[1]

  return 'IN' // safe default for existing users
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Only set if not already chosen by the user
  if (!req.cookies.get(REGION_COOKIE)) {
    const country = detectFromHeaders(req)
    res.cookies.set(REGION_COOKIE, country, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false, // client JS needs to read it
      sameSite: 'lax',
      path: '/',
    })
  }

  return res
}

export const config = {
  // Skip static assets, images, and API routes
  matcher: ['/((?!_next/static|_next/image|favicon|api|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?|ttf)).*)'],
}
