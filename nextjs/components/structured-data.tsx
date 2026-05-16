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
      'RentyBase is India\'s free rental operating system — connecting landlords and tenants through shared rent records, HRA receipts, deposit tracking, move-in proof, and repair management.',
    foundingDate: '2026',
    areaServed: { '@type': 'Country', name: 'India' },
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
    description:
      'Free rental management app for Indian landlords and tenants. Generate Section 10(13A)-compliant HRA receipts, track rent payments, manage security deposits, log repairs, and document move-in condition with tamper-proof geotagged photos.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      description: 'Free for both landlords and tenants. No subscription required.',
    },
    featureList: [
      'HRA Rent Receipt Generation (Section 10(13A) compliant)',
      'Shared Rent Ledger — landlord and tenant see the same record',
      'Security Deposit Tracking with deduction breakdown',
      'Move-in Photo Proof (timestamped, geotagged, tamper-proof)',
      'Repair Request Management with status tracking',
      'Digital Leave & License Agreement',
      'Tenant Onboarding via Invite Link',
      'UPI and Bank Transfer Payment Logging',
      'UTR Number per Payment Entry',
      'Section 80GG Support for non-HRA earners',
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
    description: "India's free rental OS for landlords and tenants.",
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-IN',
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
