'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/insights', label: 'Insights' },
  { href: '/admin/health', label: 'Health' },
]

export function AdminNav() {
  const path = usePathname()
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Admin sections">
      {TABS.map((t) => {
        const active = t.href === '/admin' ? path === '/admin' : path.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              active
                ? 'border-[var(--rb-action)] text-[var(--rb-action)]'
                : 'border-transparent text-[var(--rb-ink-3)] hover:text-[var(--rb-ink)]'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
