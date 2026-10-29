import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { LogoLockup } from '@/components/brand'
import { AdminNav } from '@/components/admin/nav'
import { requireAdmin } from '@/lib/admin/data'

export const metadata: Metadata = {
  title: 'Platform admin',
  robots: { index: false, follow: false },
}

// Non-admins get the ordinary 404 from requireAdmin(), so the route does not
// advertise that it exists.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdmin()

  return (
    <div className="min-h-screen bg-[var(--rb-canvas)]">
      <header className="sticky top-0 z-10 border-b border-[var(--rb-border)] bg-[var(--rb-surface)]/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-3 pt-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/admin" aria-label="Admin home"><LogoLockup size={24} fontSize={16} /></Link>
              <span className="rounded-full bg-[var(--rb-ink)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--rb-canvas)]">Admin</span>
            </div>
            <div className="flex min-w-0 items-center gap-3 text-xs text-[var(--rb-ink-3)]">
              <span className="hidden truncate sm:inline">{user.email}</span>
              <Link href="/dashboard" className="whitespace-nowrap font-medium text-[var(--rb-action)] hover:underline">Back to app</Link>
            </div>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">{children}</main>
    </div>
  )
}
