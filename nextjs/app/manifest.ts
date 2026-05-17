import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RentyBase — India's Rental OS",
    short_name: 'RentyBase',
    description:
      'Free rental management for Indian landlords and tenants. HRA receipts, rent tracking, deposits, repairs, and move-in proof.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    background_color: '#0E1413',
    theme_color: '#0E1413',
    orientation: 'portrait-primary',
    lang: 'en-IN',
    dir: 'ltr',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icon',        sizes: '512x512',  type: 'image/png',     purpose: 'any' },
      { src: '/apple-icon',  sizes: '180x180',  type: 'image/png',     purpose: 'any' },
    ],
    screenshots: [
      {
        src: '/opengraph-image',
        sizes: '1200x630',
        type: 'image/png',
        form_factor: 'wide',
        label: 'RentyBase Dashboard',
      },
    ],
  }
}
