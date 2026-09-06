import type { Metadata } from 'next'

// Onboarding is a post-sign-in step with nothing a search engine should surface.
// It inherited the root layout's `index, follow`. /signin and /signup are left
// indexable on purpose: they are entry points people search for by name.

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children
}
