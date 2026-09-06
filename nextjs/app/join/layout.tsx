import type { Metadata } from 'next'

// Invite pages must never be indexed.
//
// /join/<token> renders a rental's monthly rent, deposit, property name and the
// landlord's name to whoever holds the link — that is the point of it. The root
// layout's default is `robots: index, follow`, which this route inherited, so a
// shared invite link that a crawler reached would have been indexed with all of
// that on the result page. The code-entry page at /join has no value to a search
// engine either.
//
// A layout is the right place for this: the pages themselves are client
// components and cannot export metadata.

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children
}
