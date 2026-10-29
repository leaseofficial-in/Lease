'use server'

import { revealPayout } from '@/lib/admin/data'

// Logged in admin_audit_log by the SQL function; refused for non-admins there too.
export async function revealPayoutAction(userId: string) {
  return revealPayout(userId)
}
