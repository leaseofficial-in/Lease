import type { Metadata, Viewport } from 'next'
import { DM_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { AuthLoader } from '@/components/auth-loader'
import { RootStructuredData } from '@/components/structured-data'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin', 'latin-ext'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://rentybase.com')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  // Homepage title — individual pages override with their own `title` export
  title: {
    default: 'RentyBase — Free Rental Management for Landlords & Tenants',
    template: '%s | RentyBase',
  },
  description:
    'Free rental OS for landlords and tenants worldwide. Track rent payments, manage security deposits, document move-in proof, handle repairs, and generate rent receipts — shared in real time.',

  applicationName: 'RentyBase',
  keywords: [
    'rental management app',
    'landlord app',
    'tenant app',
    'rent payment tracker',
    'security deposit management',
    'move-in proof app',
    'rental agreement',
    'free property management app',
    'repair tracking landlord',
    'rent receipt generator',
    // India-specific for existing SEO equity
    'HRA rent receipt generator',
    'Section 10(13A) rent receipt',
    'rental management app India',
  ],
  authors: [{ name: 'RentyBase', url: 'https://rentybase.com' }],
  creator: 'RentyBase',
  publisher: 'RentyBase',
  category: 'Business',
  classification: 'Property Management Software',

  openGraph: {
    type: 'website',
    siteName: 'RentyBase',
    title: 'RentyBase — Free Rental Management for Landlords & Tenants',
    description:
      'Track rent payments, manage deposits, log repairs, and share move-in proof — all free. Built for landlords and tenants everywhere.',
    url: siteUrl,
    locale: 'en_US',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'RentyBase — Rental Management for Everyone',
        type: 'image/png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'RentyBase — Free Rental Management App',
    description:
      'Track rent, manage deposits and repairs, generate receipts. Free for landlords and tenants worldwide.',
    images: ['/opengraph-image'],
  },

  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon',        type: 'image/png',     sizes: '512x512' },
    ],
    apple:    [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
    shortcut:   '/favicon.svg',
    other: [{ rel: 'mask-icon', url: '/favicon.svg', color: '#0E1413' }],
  },

  manifest: '/manifest',

  alternates: {
    canonical: siteUrl,
    languages: {
      'en': siteUrl,
      'en-US': siteUrl,
      'en-IN': siteUrl,
      'en-GB': siteUrl,
    },
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RentyBase',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0E1413',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full">
        {children}
        <AuthLoader />
        <RootStructuredData />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
