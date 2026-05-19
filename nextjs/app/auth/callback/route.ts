import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') // destination preserved through OAuth round-trip

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(
        `${origin}/signin?error=auth_failed&reason=${encodeURIComponent(error.message)}`
      )
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, country_code')
        .eq('id', data.user.id)
        .single()

      if (profile?.role) {
        if (!profile.country_code) {
          // Existing user without a country — route through country selection first
          const dest = next && next.startsWith('/') ? next : '/dashboard'
          return NextResponse.redirect(
            `${origin}/onboarding/country?next=${encodeURIComponent(dest)}`
          )
        }
        // Existing user with country — honour the next param or fall back to dashboard
        const dest = next && next.startsWith('/') ? next : '/dashboard'
        return NextResponse.redirect(`${origin}${dest}`)
      } else {
        // New user — needs role selection; forward next so signup can redirect after
        const signupDest = next
          ? `/signup?next=${encodeURIComponent(next)}`
          : '/signup'
        return NextResponse.redirect(`${origin}${signupDest}`)
      }
    }

    console.error('[auth/callback] exchange succeeded but no user returned')
    return NextResponse.redirect(`${origin}/signin?error=auth_failed&reason=no_user`)
  }

  console.error('[auth/callback] no code in URL, params:', new URL(request.url).search)
  return NextResponse.redirect(`${origin}/signin?error=auth_failed&reason=no_code`)
}
