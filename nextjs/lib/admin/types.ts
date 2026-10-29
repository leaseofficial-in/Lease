// ─── Shapes returned by the admin_* functions in 054_platform_admin.sql ──────
//
// The database returns jsonb, so these are a contract with that SQL, not
// something the client can check. Keep the two in step.

export type Role = 'landlord' | 'tenant' | null

export interface AdminOverview {
  users: number
  landlords: number
  tenants: number
  no_role: number
  new_7d: number
  new_30d: number
  signed_in_7d: number
  signed_in_30d: number
  properties: number
  rentals_active: number
  rentals_pending: number
  managed_tenants: number
  errors_24h: number
  emails_failed_7d: number
  rent_this_month: { country_code: string; due: number; paid: number; rows: number; overdue: number }[]
  signups_by_week: { week: string; count: number }[]
}

export interface AdminUser {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: Role
  country_code: string | null
  avatar_url: string | null
  created_at: string
  last_sign_in_at: string | null
  last_active_at: string | null
  provider: string
  properties: number
  rentals: number
  active_rentals: number
  rentals_with_tenant: number
  landlord_paid_payments: number
  tenancies: number
  tenant_paid_payments: number
  is_admin: boolean
}

export interface AdminUserDetail {
  profile: {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    role: Role
    avatar_url: string | null
    country_code: string | null
    currency_code: string | null
    timezone: string | null
    locale: string | null
    created_at: string
    updated_at: string
    has_pan: boolean
    has_aadhaar: boolean
    has_upi: boolean
    has_payout_details: boolean
    push_enabled: boolean
    email_notifications: Record<string, boolean> | null
    provider: string
    last_sign_in_at: string | null
    email_confirmed_at: string | null
    banned_until: string | null
    is_admin: boolean
  }
  properties: {
    id: string
    name: string
    city: string | null
    country_code: string | null
    property_type: string | null
    archived_at: string | null
    created_at: string
    rentals: number
  }[]
  rentals: {
    id: string
    side: 'landlord' | 'tenant'
    property_name: string
    city: string | null
    country_code: string
    status: string
    monthly_rent: number
    security_deposit: number
    start_date: string | null
    end_date: string | null
    agreement_status: string | null
    landlord_id: string
    landlord_name: string | null
    tenant_id: string | null
    tenant_name: string | null
    managed: boolean
    created_at: string
    paid: number
    pending: number
    overdue: number
  }[]
  payments: {
    id: string
    month: string
    amount: number
    late_fee: number
    status: string
    payment_method: string | null
    paid_at: string | null
    created_at: string
    property_name: string
    country_code: string
  }[]
  activity: { source: 'product' | 'rental'; name: string; detail: Record<string, unknown> | null; at: string }[]
  emails: { email_type: string; subject: string | null; status: string; skip_reason: string | null; error: string | null; created_at: string }[]
  errors: { message: string; context: string | null; created_at: string }[]
  referrals: { side: 'tenant' | 'landlord'; other_name: string | null; status: string; created_at: string; activated_at: string | null }[]
  counts: { messages_sent: number; repairs_raised: number; notifications_unread: number }
  recent_views: { action: string; created_at: string; admin_name: string | null }[]
}

export interface AdminHealth {
  error_groups: { message: string; context: string | null; count: number; users: number; last_seen: string }[]
  errors_by_day: { day: string; count: number }[]
  email_summary: { email_type: string; status: string; count: number }[]
  email_problems: { recipient_id: string | null; email_type: string; status: string; skip_reason: string | null; error: string | null; created_at: string }[]
  agent_summary: { agent_type: string; status: string; count: number; last_at: string }[]
  agent_failures: { agent_type: string; status: string; error: string | null; created_at: string }[]
  cron: { jobname: string; schedule: string; active: boolean; last_status: string | null; last_run_at: string | null; last_message: string | null; failed_7d: number }[] | null
}
