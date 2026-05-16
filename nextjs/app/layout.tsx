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
    default: 'RentyBase — Free Rental Management App for Landlords & Tenants in India',
    template: '%s | RentyBase',
  },
  description:
    "India's free rental OS. Generate HRA receipts (Section 10(13A)), track rent payments, manage security deposits, document move-in proof, and log repairs — shared in real time between landlord and tenant.",

  applicationName: 'RentyBase',
  keywords: [
    'rental management app India',
    'HRA rent receipt generator',
    'Section 10(13A) rent receipt',
    'rent receipt for income tax',
    'landlord app India',
    'tenant app India',
    'rent payment tracker',
    'security deposit management India',
    'move-in proof app',
    'Leave and License agreement',
    'free property management app',
    'HRA exemption India',
    'repair tracking landlord',
    'Section 80GG deduction',
  ],
  authors: [{ name: 'RentyBase', url: 'https://rentybase.com' }],
  creator: 'RentyBase',
  publisher: 'RentyBase',
  category: 'Business',
  classification: 'Property Management Software',

  openGraph: {
    type: 'website',
    siteName: 'RentyBase',
    title: 'RentyBase — Free Rental Management for Landlords & Tenants in India',
    description:
      'Generate HRA receipts, track rent payments, manage deposits, log repairs, and share move-in proof — all free. Built for Indian landlords and tenants.',
    url: siteUrl,
    locale: 'en_IN',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: "RentyBase — India's Rental OS",
        type: 'image/png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'RentyBase — Free Rental Management for India',
    description:
      'Generate HRA receipts, track rent, manage deposits and repairs. Free for landlords and tenants across India.',
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
    languages: { 'en-IN': siteUrl },
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
      lang="en-IN"
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
