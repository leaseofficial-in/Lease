import type { Metadata, Viewport } from 'next'
import { DM_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
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
  title: "RentyBase — India's Rental OS",
  description: 'Manage rent, deposits, repairs and agreements — all in one place.',
  applicationName: 'RentyBase',
  keywords: ['rental management', 'rent payment', 'HRA receipt', 'India rental', 'landlord app', 'tenant app', 'deposit', 'repair tracking'],
  authors: [{ name: 'RentyBase' }],
  creator: 'RentyBase',
  openGraph: {
    type: 'website',
    siteName: 'RentyBase',
    title: "RentyBase — India's Rental OS",
    description: 'Manage rent, deposits, repairs and agreements — all in one place.',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: "RentyBase — India's Rental OS",
    description: 'Manage rent, deposits, repairs and agreements — all in one place.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'mask-icon', url: '/favicon.svg', color: '#0E1413' }],
  },
  manifest: '/manifest',
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
