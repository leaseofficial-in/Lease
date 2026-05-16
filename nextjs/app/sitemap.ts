import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://rentybase.com'
  const now = new Date()

  return [
    { url: base,                          lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/features`,            lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/for/landlords`,       lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/for/tenants`,         lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/tools`,               lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog`,                lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/compare`,             lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/company`,             lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`,             lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`,             lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/terms`,               lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
