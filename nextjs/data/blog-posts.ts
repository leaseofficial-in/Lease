// Blog article metadata. The article bodies live in components/blog/<slug>.tsx and are
// wired to these slugs in app/blog/[slug]/page.tsx.
//
// These three slugs were originally published as static HTML under landing/ and are indexed
// by Google. Do not rename them — the URLs must keep resolving.

export type BlogFAQ = { question: string; answer: string }

export type BlogRelated = { label: string; href: string }

export type BlogPost = {
  slug: string
  tag: string
  tagEmoji: string
  /** <h1> on the page */
  title: string
  /** <title> in <head> — may differ from the h1 */
  seoTitle: string
  /** Short label used in breadcrumbs */
  breadcrumb: string
  description: string
  ogDescription: string
  /** Card excerpt on /blog */
  excerpt: string
  date: string
  datePublished: string
  dateModified: string
  readTime: string
  toc: string[]
  faqs: BlogFAQ[]
  related: BlogRelated[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-collect-rent-india-landlord-guide',
    tag: 'For Landlords',
    tagEmoji: '💰',
    title: 'How to Collect Rent in India: The Complete Landlord Guide (2025)',
    seoTitle: 'How to Collect Rent in India: Complete Landlord Guide 2025',
    breadcrumb: 'Rent Collection Guide',
    description:
      'The complete guide to collecting rent in India. UPI vs NEFT vs cash, payment proof to keep, handling late payments, issuing HRA-compliant receipts, and tools that make it automatic.',
    ogDescription:
      'Best practices for Indian landlords: payment methods, proof to keep, late payment handling, and HRA receipt compliance.',
    excerpt:
      'UPI vs NEFT vs cash, what payment proof to keep, how to set a due date, issuing HRA-compliant receipts, and handling late payments without wrecking the relationship.',
    date: 'May 2025',
    datePublished: '2025-05-01',
    dateModified: '2025-05-06',
    readTime: '7 min read',
    toc: [
      'Choosing a payment method',
      'Payment proof to keep',
      'Setting the due date',
      'Issuing HRA receipts',
      'Handling late payments',
      'Maintaining records',
      'How RentyBase automates it',
    ],
    faqs: [
      {
        question: 'What is the best way to collect rent in India?',
        answer:
          'UPI is the most recommended method for rent collection in India — instant, free, traceable, and works on any smartphone. NEFT is better for large amounts. Avoid cash where possible as it creates no paper trail.',
      },
      {
        question: 'Is it legal to collect rent in cash in India?',
        answer:
          'Yes, cash is legal. However, cash transactions above ₹20,000 are subject to TDS restrictions. For large rents, digital transfers (UPI/NEFT) are safer and create an automatic audit trail.',
      },
      {
        question: 'Do I need to issue a rent receipt for every payment?',
        answer:
          'Yes. Tenants have a legal right to a receipt on payment. More importantly, if your tenant claims HRA and annual rent exceeds ₹1 lakh, they need receipts with your PAN number to get the tax exemption.',
      },
      {
        question: "What happens if a tenant doesn't pay rent on time?",
        answer:
          'Send a formal reminder first. If unpaid after 15 days, issue a legal notice under the applicable state rent control act. Most states allow landlords to file for eviction after repeated non-payment, but the process takes months — prevention through clear terms and reminders is far better.',
      },
    ],
    related: [
      { label: "Landlord won't give HRA receipts?", href: '/blog/how-to-claim-hra-when-landlord-wont-give-rent-receipts' },
      { label: 'Can a landlord deduct deposit for wear and tear?', href: '/blog/can-landlord-deduct-security-deposit-wear-and-tear-india' },
      { label: 'RentyBase for landlords', href: '/for/landlords' },
    ],
  },
  {
    slug: 'how-to-claim-hra-when-landlord-wont-give-rent-receipts',
    tag: 'Tax & HRA',
    tagEmoji: '📄',
    title: "How to Claim HRA When Your Landlord Won't Give Rent Receipts",
    seoTitle: "How to Claim HRA When Your Landlord Won't Give Rent Receipts",
    breadcrumb: 'HRA Without Receipts',
    description:
      'Four ways to claim HRA under Section 10(13A) when your landlord refuses to issue rent receipts — what works, what the law says, and what will get you in trouble.',
    ogDescription:
      'Generate and get receipts signed, use bank transfer proof, or self-declare. What works for HRA claims when your landlord refuses receipts.',
    excerpt:
      'Your landlord is ignoring your calls and HR wants declarations by the 15th. Four options ranked by risk, what the law actually says, and the one thing that counts as tax fraud.',
    date: 'May 2025',
    datePublished: '2025-05-01',
    dateModified: '2025-05-06',
    readTime: '8 min read',
    toc: [
      'Why receipts matter for HRA',
      'What the law says',
      'Option 1: Generate & get signed',
      'Option 2: Bank statements',
      'Option 3: Self-declaration',
      'The permanent solution',
      'Summary',
    ],
    faqs: [
      {
        question: 'Can I claim HRA without rent receipts?',
        answer:
          'Technically yes, if monthly rent is below ₹3,000 (no receipt required by law). Above that, rent receipts or comparable proof are needed. Without receipts, you can use bank statements showing transfers + a self-declaration, but this carries risk during IT scrutiny.',
      },
      {
        question: 'Is a landlord legally obligated to give rent receipts?',
        answer:
          'Landlords are expected to provide rent receipts under Section 10(13A) requirements, but there is no specific penal provision for refusal under central law. State rent control acts may provide more tenant protections.',
      },
      {
        question: 'What documents can substitute rent receipts for HRA?',
        answer:
          "Bank statements showing monthly transfers to landlord, UPI payment history, a self-declaration with landlord's name and address, and a copy of the rental agreement together can be used as supporting evidence.",
      },
    ],
    related: [
      { label: 'Can a landlord deduct deposit for wear and tear?', href: '/blog/can-landlord-deduct-security-deposit-wear-and-tear-india' },
      { label: 'How to collect rent in India — landlord guide', href: '/blog/how-to-collect-rent-india-landlord-guide' },
      { label: 'RentyBase for tenants', href: '/for/tenants' },
    ],
  },
  {
    slug: 'can-landlord-deduct-security-deposit-wear-and-tear-india',
    tag: 'Tenant Rights',
    tagEmoji: '🏠',
    title: 'Can a Landlord Deduct Security Deposit for Normal Wear and Tear in India?',
    seoTitle: 'Can a Landlord Deduct Deposit for Wear and Tear in India?',
    breadcrumb: 'Security Deposit Rights',
    description:
      'What counts as normal wear and tear versus chargeable damage in India, what the Model Tenancy Act 2021 says about deposits, and how to protect your deposit before you move out.',
    ogDescription:
      'Normal wear and tear is not chargeable. Here is the line between wear and damage, what Indian law says, and how to document your way out of a dispute.',
    excerpt:
      'Landlords cannot charge you for faded paint or worn carpet — only for damage you caused. Here is the line, what the Model Tenancy Act says, and how to prove what was pre-existing.',
    date: 'May 2025',
    datePublished: '2025-05-01',
    dateModified: '2025-05-06',
    readTime: '9 min read',
    toc: [
      'What is wear and tear?',
      'Chargeable vs. not chargeable',
      'What Indian law says',
      'How to protect your deposit',
      'If landlord wrongfully withholds',
      'How RentyBase helps',
    ],
    faqs: [
      {
        question: 'What is considered normal wear and tear in India?',
        answer:
          'Normal wear and tear includes: faded paint, minor scuffs on walls from furniture, small nail holes, worn floor finish, faded or frayed carpets, and general ageing of fixtures. These are expected from reasonable everyday use and cannot be charged to the tenant.',
      },
      {
        question: 'Can a landlord keep my entire deposit?',
        answer:
          "No. A landlord can only deduct for actual damage beyond normal wear and tear, unpaid rent, or breach of agreement terms. Keeping the entire deposit without documented justification violates the tenant's rights under state rent control acts.",
      },
      {
        question: 'How do I protect my security deposit?',
        answer:
          "Take timestamped photos of every room when you move in, document all pre-existing damage in writing with the landlord's acknowledgment, and keep copies of all payment receipts. These records are your strongest protection against wrongful deductions.",
      },
    ],
    related: [
      { label: "Landlord won't give HRA receipts?", href: '/blog/how-to-claim-hra-when-landlord-wont-give-rent-receipts' },
      { label: 'How to collect rent in India — landlord guide', href: '/blog/how-to-collect-rent-india-landlord-guide' },
      { label: 'RentyBase for tenants', href: '/for/tenants' },
    ],
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug)
}

export function getAllBlogParams() {
  return BLOG_POSTS.map(p => ({ slug: p.slug }))
}
