import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import { FAQStructuredData, BreadcrumbStructuredData } from '@/components/structured-data'
import {
  ArticleBreadcrumb,
  ArticleHero,
  ArticleLayout,
  ArticleFAQ,
} from '@/components/article-shell'
import { getBlogPost, getAllBlogParams } from '@/data/blog-posts'
import { CollectRentIndiaArticle } from '@/components/blog/collect-rent-india'
import { HraWithoutReceiptsArticle } from '@/components/blog/hra-without-receipts'
import { SecurityDepositWearAndTearArticle } from '@/components/blog/security-deposit-wear-and-tear'

const BASE = 'https://rentybase.com'

const BODIES: Record<string, () => React.ReactElement> = {
  'how-to-collect-rent-india-landlord-guide': CollectRentIndiaArticle,
  'how-to-claim-hra-when-landlord-wont-give-rent-receipts': HraWithoutReceiptsArticle,
  'can-landlord-deduct-security-deposit-wear-and-tear-india': SecurityDepositWearAndTearArticle,
}

// Pre-build every article at deploy time; 404 anything not in the dataset.
export const dynamicParams = false

export function generateStaticParams() {
  return getAllBlogParams()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}
  const url = `${BASE}/blog/${post.slug}`
  return {
    title: post.seoTitle,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: `${post.seoTitle} | RentyBase`,
      description: post.ogDescription,
      url,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.seoTitle} | RentyBase`,
      description: post.ogDescription,
    },
  }
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPost(slug)
  const Body = post ? BODIES[post.slug] : undefined
  if (!post || !Body) notFound()

  const url = `${BASE}/blog/${post.slug}`

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.seoTitle,
    description: post.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    author: { '@type': 'Organization', name: 'RentyBase', url: BASE },
    publisher: { '@id': `${BASE}/#org` },
    image: `${BASE}/opengraph-image`,
    inLanguage: 'en-IN',
  }

  return (
    <div className="lp-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: BASE },
          { name: 'Blog', url: `${BASE}/blog` },
          { name: post.breadcrumb, url },
        ]}
      />
      <FAQStructuredData faqs={post.faqs} />

      <MarketingNav />
      <ArticleBreadcrumb current={post.breadcrumb} />
      <ArticleHero post={post} />
      <ArticleLayout post={post}>
        <Body />
        <ArticleFAQ faqs={post.faqs} />
      </ArticleLayout>
      <MarketingFooter />
    </div>
  )
}
