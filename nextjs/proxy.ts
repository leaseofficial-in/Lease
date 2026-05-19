import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { REGION_COOKIE } from '@/lib/region'
import { REGIONS } from '@/lib/i18n/regions'

const SUPPORTED = new Set(Object.keys(REGIONS))

function detectCountry(req: NextRequest): string {
  const vercelCountry = req.headers.get('x-vercel-ip-country')
  if (vercelCountry && SUPPORTED.has(vercelCountry)) return vercelCountry
  const acceptLang = req.headers.get('accept-language') ?? ''
  const match = acceptLang.match(/[a-z]{2}-([A-Z]{2})/)
  if (match?.[1] && SUPPORTED.has(match[1])) return match[1]
  return 'IN'
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Country cookie — fast, no network call
  const needsCountry = !request.cookies.get(REGION_COOKIE)

  // Auth check only for pages that need it
  const isAuthPage = path === '/signin' || path === '/signup'
  const isDashboard = path.startsWith('/dashboard')
  const needsAuth = isAuthPage || isDashboard

  if (!needsAuth) {
    const res = NextResponse.next({ request })
    if (needsCountry) {
      res.cookies.set(REGION_COOKIE, detectCountry(request), {
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      })
    }
    return res
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  if (user && isAuthPage) {
    if (path === '/signup') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile?.role) {
        if (needsCountry) {
          supabaseResponse.cookies.set(REGION_COOKIE, detectCountry(request), {
            maxAge: 60 * 60 * 24 * 365,
            httpOnly: false,
            sameSite: 'lax',
            path: '/',
          })
        }
        return supabaseResponse
      }
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (needsCountry) {
    supabaseResponse.cookies.set(REGION_COOKIE, detectCountry(request), {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|api|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?|ttf)).*)',
  ],
}
