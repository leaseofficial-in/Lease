import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AdminHealth, AdminOverview, AdminUser, AdminUserDetail } from './types'

// ─── Server-side reads for /admin ────────────────────────────────────────────
//
// Every read goes through an admin_* SQL function (054_platform_admin.sql) using
// the caller's own session. The functions refuse anyone not in platform_admins,
// so the check here is for the UX (a 404 instead of an error page) -- the
// database is the actual gate. No service_role key is involved.

/** Resolves the signed-in admin, or 404s. Cached per request. */
export const requireAdmin = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: isAdmin } = await supabase.rpc('is_platform_admin')
  if (isAdmin !== true) notFound()
  return { user, supabase }
})

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(`${fn}: ${error.message}`)
  return data as T
}

export const getOverview = () => call<AdminOverview>('admin_overview')
export const getUsers = cache(() => call<AdminUser[]>('admin_users'))
export const getUserDetail = (id: string) => call<AdminUserDetail | null>('admin_user_detail', { target: id })
export const getHealth = () => call<AdminHealth>('admin_health')
export const revealPayout = (id: string) =>
  call<{ upi_id: string | null; payout_details: string | null } | null>('admin_reveal_payout', { target: id })
