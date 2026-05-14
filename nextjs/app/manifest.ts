import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RentyBase — India's Rental OS",
    short_name: 'RentyBase',
    description: 'Manage rent, deposits, repairs and agreements — all in one place.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0E1413',
    theme_color: '#0E1413',
    orientation: 'portrait-primary',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  }
}
