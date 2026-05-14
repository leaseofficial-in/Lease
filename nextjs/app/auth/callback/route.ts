import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

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
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role) {
        return NextResponse.redirect(`${origin}/dashboard`)
      } else {
        return NextResponse.redirect(`${origin}/signup`)
      }
    }

    console.error('[auth/callback] exchange succeeded but no user returned')
    return NextResponse.redirect(`${origin}/signin?error=auth_failed&reason=no_user`)
  }

  console.error('[auth/callback] no code in URL, params:', new URL(request.url).search)
  return NextResponse.redirect(`${origin}/signin?error=auth_failed&reason=no_code`)
}
