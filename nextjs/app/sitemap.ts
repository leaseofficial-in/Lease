import type { MetadataRoute } from 'next'
import { SEO_COUNTRIES } from '@/data/locations'
import { BLOG_POSTS } from '@/data/blog-posts'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://rentybase.com'
  const now = new Date()

  const core: MetadataRoute.Sitemap = [
    { url: base,                    lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/features`,      lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/for/landlords`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/for/tenants`,   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/tools`,         lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/compare`,       lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/company`,       lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`,       lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/terms`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  const blogPosts: MetadataRoute.Sitemap = BLOG_POSTS.map(p => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.dateModified),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Programmatic SEO: worldwide index + per-country + per-city geo landing pages.
  const rentalsIndex: MetadataRoute.Sitemap = [
    { url: `${base}/rentals`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ]

  const countryPages: MetadataRoute.Sitemap = SEO_COUNTRIES.map(c => ({
    url: `${base}/rentals/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const cityPages: MetadataRoute.Sitemap = SEO_COUNTRIES.flatMap(c =>
    c.cities.map(ci => ({
      url: `${base}/rentals/${c.slug}/${ci.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  )

  return [...core, ...blogPosts, ...rentalsIndex, ...countryPages, ...cityPages]
}
