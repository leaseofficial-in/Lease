// Server component — renders JSON-LD <script> tags into <head> via Next.js App Router

const ORG_ID = 'https://rentybase.com/#org'
const WEBSITE_ID = 'https://rentybase.com/#website'
const APP_ID = 'https://rentybase.com/#app'

/** Organization + SoftwareApplication + WebSite — injected in root layout, present on every page */
export function RootStructuredData() {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'RentyBase',
    url: 'https://rentybase.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://rentybase.com/icon',
      width: 512,
      height: 512,
    },
    description:
      'RentyBase is a free rental operating system — connecting landlords and tenants worldwide through shared rent records, rent receipts, deposit tracking, move-in proof, and repair management.',
    foundingDate: '2026',
    areaServed: 'Worldwide',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@rentybase.com',
      url: 'https://rentybase.com/contact',
      availableLanguage: ['English', 'Hindi'],
    },
    sameAs: [] as string[],
  }

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': APP_ID,
    name: 'RentyBase',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Property Management Software',
    operatingSystem: 'Web, Android, iOS',
    url: 'https://rentybase.com',
    areaServed: 'Worldwide',
    description:
      'Free rental management app for landlords and tenants worldwide. Generate tax-compliant rent receipts, track rent payments, manage security deposits, log repairs, and document move-in condition with tamper-proof geotagged photos.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free for both landlords and tenants. No subscription required.',
    },
    featureList: [
      'Rent receipt generation (tax-compliant, incl. India HRA under Section 10(13A))',
      'Shared rent ledger — landlord and tenant see the same record',
      'Security deposit tracking with deduction breakdown',
      'Move-in photo proof (timestamped, geotagged, tamper-proof)',
      'Repair request management with status tracking',
      'Rental agreement templates (Lease, AST, Leave & License)',
      'Tenant onboarding via invite link',
      'Multi-currency rent tracking',
    ],
    screenshot: 'https://rentybase.com/opengraph-image',
    publisher: { '@id': ORG_ID },
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'RentyBase',
    url: 'https://rentybase.com',
    description: 'The free rental OS for landlords and tenants worldwide.',
    publisher: { '@id': ORG_ID },
    inLanguage: 'en',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  )
}

export interface FAQ {
  question: string
  answer: string
}

/** FAQPage schema — add to server-component pages with visible FAQ content */
export function FAQStructuredData({ faqs }: { faqs: FAQ[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export interface BreadcrumbItem {
  name: string
  url: string
}

/** BreadcrumbList schema — add to all non-homepage pages */
export function BreadcrumbStructuredData({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/** SoftwareApplication schema scoped to a place — used on the geo /rentals pages */
export function SoftwareAppStructuredData({
  url,
  areaServed,
  description,
  priceCurrency = 'USD',
}: {
  url: string
  areaServed: string
  description?: string
  priceCurrency?: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'RentyBase',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Property Management Software',
    operatingSystem: 'Web, Android, iOS',
    url,
    areaServed: { '@type': 'Place', name: areaServed },
    ...(description ? { description } : {}),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency,
      description: 'Free for both landlords and tenants. No subscription required.',
    },
    publisher: { '@id': ORG_ID },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
