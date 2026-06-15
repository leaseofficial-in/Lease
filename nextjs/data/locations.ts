// ─── Programmatic SEO location dataset ────────────────────────────────────────
// Content layer for the geo landing pages under /rentals/[country]/[city].
//
// This file is the SINGLE SOURCE OF TRUTH for the SEO surface. It builds ON TOP
// of lib/i18n/regions.ts (the runtime region registry) — currency, locale, flag,
// and formatting all come from getRegion(country.code) so there is no duplication.
//
// avgRent figures and neighbourhood lists are researched estimates for SEO copy,
// not live market data. Keep them directionally sensible; they are illustrative.

import type { CountryCode } from '@/lib/i18n/regions';

export interface SeoCity {
  slug: string;            // url-safe, e.g. "mumbai"
  name: string;            // display name
  region: string;          // state / province / county / territory / district
  avgRent: number;         // typical monthly rent, in the country's local currency
  neighborhoods: string[]; // 3–4 well-known local areas
  searchVolume: 'high' | 'medium' | 'low';
}

export interface SeoCountry {
  code: CountryCode;       // ISO alpha-2 — keys into lib/i18n/regions.ts
  slug: string;            // lowercased code, e.g. "in"
  name: string;            // display name
  valueProp: string;       // hero subheading for the country page
  features: string[];      // product features relevant to this country (country-filtered)
  legalNote: string;       // key rental-law note
  taxNote: string;         // tax / receipt note
  agreementType: string;   // e.g. "Leave & License", "AST", "Lease"
  depositNote: string;     // deposit-law note
  primaryLanguage: string;
  metaKeywords: string[];  // SEO keywords for this country
  faqs: { question: string; answer: string }[]; // 5 country-level FAQs
  cities: SeoCity[];
}

// ─── Countries ────────────────────────────────────────────────────────────────

export const SEO_COUNTRIES: SeoCountry[] = [
  {
    code: 'IN',
    slug: 'in',
    name: 'India',
    valueProp:
      'Track rent, auto-generate Section 10(13A) HRA receipts, and seal move-in proof — free for Indian landlords and tenants.',
    features: [
      'HRA rent receipts (Section 10(13A) compliant)',
      'UPI & NEFT payment logging with UTR reference',
      'Leave & License agreement templates',
      'Security deposit ledger with deduction proof',
      'Tamper-proof, geotagged move-in photos',
    ],
    legalNote:
      'Residential tenancies in India are governed by state Rent Control Acts and the Model Tenancy Act, 2021. In states like Maharashtra, Leave & License agreements must be registered and stamped.',
    taxNote:
      'Salaried tenants can claim HRA exemption under Section 10(13A) with valid rent receipts. The landlord’s PAN is mandatory when annual rent exceeds ₹1,00,000.',
    agreementType: 'Leave & License',
    depositNote:
      'Security deposits commonly run 2–3 months’ rent (higher in some metros). The Model Tenancy Act caps residential deposits at two months’ rent.',
    primaryLanguage: 'English / Hindi',
    metaKeywords: [
      'rent receipt generator india',
      'HRA receipt online',
      'Section 10(13A) rent receipt',
      'rental management app india',
      'landlord app india',
    ],
    faqs: [
      {
        question: 'What is HRA exemption and how do rent receipts help?',
        answer:
          'House Rent Allowance (HRA) exemption under Section 10(13A) lets salaried employees claim part of their rent as tax-exempt. You need valid rent receipts showing the tenant name, landlord name and PAN, rent amount, period, and property address. RentyBase generates these automatically each month.',
      },
      {
        question: 'Is the landlord’s PAN required on a rent receipt?',
        answer:
          'Yes — the landlord’s PAN is mandatory on rent receipts when your annual rent exceeds ₹1,00,000 (roughly ₹8,333 per month). Below that threshold PAN is optional but recommended for a complete record.',
      },
      {
        question: 'How much security deposit can a landlord ask for?',
        answer:
          'It varies by state and city — commonly 2–3 months’ rent, though some metros historically asked for more. The Model Tenancy Act, 2021 caps residential deposits at two months’ rent in states that have adopted it.',
      },
      {
        question: 'Does a rental agreement need to be registered?',
        answer:
          'Agreements of 12 months or longer generally require registration and stamp duty. In Maharashtra, Leave & License agreements must be registered regardless of duration. RentyBase provides templated agreements you can e-sign and attach to the property.',
      },
      {
        question: 'Is RentyBase really free for landlords and tenants in India?',
        answer:
          'Yes. Rent tracking, HRA receipts, deposit ledger, move-in proof, and repair management are all free for both sides. No subscription and no credit card required.',
      },
    ],
    cities: [
      { slug: 'mumbai',    name: 'Mumbai',    region: 'Maharashtra',   avgRent: 65000, neighborhoods: ['Bandra', 'Andheri', 'Powai', 'Lower Parel'],            searchVolume: 'high' },
      { slug: 'delhi',     name: 'Delhi',     region: 'Delhi',         avgRent: 35000, neighborhoods: ['Saket', 'Dwarka', 'Vasant Kunj', 'Rohini'],             searchVolume: 'high' },
      { slug: 'bangalore', name: 'Bangalore', region: 'Karnataka',     avgRent: 32000, neighborhoods: ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout'], searchVolume: 'high' },
      { slug: 'hyderabad', name: 'Hyderabad', region: 'Telangana',     avgRent: 24000, neighborhoods: ['Gachibowli', 'Madhapur', 'Kondapur', 'Banjara Hills'],   searchVolume: 'high' },
      { slug: 'chennai',   name: 'Chennai',   region: 'Tamil Nadu',    avgRent: 22000, neighborhoods: ['Adyar', 'Velachery', 'T. Nagar', 'OMR'],                searchVolume: 'high' },
      { slug: 'pune',      name: 'Pune',      region: 'Maharashtra',   avgRent: 25000, neighborhoods: ['Koregaon Park', 'Hinjewadi', 'Kharadi', 'Baner'],        searchVolume: 'high' },
      { slug: 'kolkata',   name: 'Kolkata',   region: 'West Bengal',   avgRent: 18000, neighborhoods: ['Salt Lake', 'New Town', 'Ballygunge', 'Park Street'],    searchVolume: 'medium' },
      { slug: 'ahmedabad', name: 'Ahmedabad', region: 'Gujarat',       avgRent: 16000, neighborhoods: ['Satellite', 'Bopal', 'Prahlad Nagar', 'Vastrapur'],      searchVolume: 'medium' },
    ],
  },

  {
    code: 'US',
    slug: 'us',
    name: 'United States',
    valueProp:
      'Track rent, log security deposits, and generate rent receipts for tax records — free for U.S. landlords and renters.',
    features: [
      'Rent ledger shared with your tenant',
      'Rent receipts for tax & 1099 records',
      'Security deposit tracking with itemized deductions',
      'Move-in / move-out photo documentation',
      'Maintenance & repair request tracking',
    ],
    legalNote:
      'Landlord–tenant law in the U.S. is set at the state and local level. Security deposit caps, return deadlines, and notice periods vary significantly by state.',
    taxNote:
      'Landlords report rental income on Schedule E; renters may need rent records for state renter credits. RentyBase keeps timestamped rent receipts for both sides.',
    agreementType: 'Lease Agreement',
    depositNote:
      'Many states cap security deposits at one to two months’ rent and require return within 14–30 days of move-out with an itemized statement of deductions.',
    primaryLanguage: 'English',
    metaKeywords: [
      'rental management software',
      'landlord app usa',
      'rent receipt generator',
      'security deposit tracker',
      'lease management app',
    ],
    faqs: [
      {
        question: 'Is a written lease required in the United States?',
        answer:
          'Leases of one year or longer should be in writing to be enforceable in most states (under the Statute of Frauds). Shorter or month-to-month tenancies can be oral, but a written lease protects both parties — and RentyBase keeps the rent record either way.',
      },
      {
        question: 'What is the security deposit limit?',
        answer:
          'It depends on the state. Many states cap deposits at one to two months’ rent, and several have no statutory cap. Most states require the deposit to be returned within 14–30 days of move-out with an itemized list of any deductions.',
      },
      {
        question: 'Do I need to give rent receipts to tenants?',
        answer:
          'Some states and cities require a rent receipt on request (especially for cash payments). Regardless of the rule, a timestamped receipt protects both landlord and tenant — RentyBase generates one for every logged payment.',
      },
      {
        question: 'How does RentyBase help at tax time?',
        answer:
          'Landlords get a clean, exportable record of rent collected for Schedule E, and renters get receipts for state renter credits. Every payment is timestamped and downloadable as a PDF.',
      },
      {
        question: 'Is RentyBase free for U.S. landlords and tenants?',
        answer:
          'Yes. Rent tracking, receipts, deposit tracking, photo documentation, and repair requests are all free for both sides. No subscription, no card.',
      },
    ],
    cities: [
      { slug: 'new-york',      name: 'New York',      region: 'New York',     avgRent: 3500, neighborhoods: ['Brooklyn', 'Harlem', 'Astoria', 'Lower East Side'],   searchVolume: 'high' },
      { slug: 'los-angeles',   name: 'Los Angeles',   region: 'California',   avgRent: 2600, neighborhoods: ['Silver Lake', 'Santa Monica', 'Koreatown', 'Venice'],   searchVolume: 'high' },
      { slug: 'chicago',       name: 'Chicago',       region: 'Illinois',     avgRent: 1900, neighborhoods: ['Lincoln Park', 'Wicker Park', 'Logan Square', 'Hyde Park'], searchVolume: 'high' },
      { slug: 'houston',       name: 'Houston',       region: 'Texas',        avgRent: 1500, neighborhoods: ['Montrose', 'The Heights', 'Midtown', 'Rice Village'],    searchVolume: 'high' },
      { slug: 'san-francisco', name: 'San Francisco', region: 'California',   avgRent: 3200, neighborhoods: ['Mission District', 'SoMa', 'Nob Hill', 'Sunset'],        searchVolume: 'high' },
      { slug: 'austin',        name: 'Austin',        region: 'Texas',        avgRent: 1700, neighborhoods: ['South Congress', 'East Austin', 'Hyde Park', 'Zilker'],   searchVolume: 'high' },
      { slug: 'seattle',       name: 'Seattle',       region: 'Washington',   avgRent: 2100, neighborhoods: ['Capitol Hill', 'Ballard', 'Fremont', 'Queen Anne'],      searchVolume: 'high' },
      { slug: 'denver',        name: 'Denver',        region: 'Colorado',     avgRent: 1800, neighborhoods: ['LoDo', 'Capitol Hill', 'Highlands', 'RiNo'],             searchVolume: 'medium' },
    ],
  },

  {
    code: 'GB',
    slug: 'gb',
    name: 'United Kingdom',
    valueProp:
      'Track rent, log deposits, and keep rent receipts for HMRC — free for UK landlords and tenants.',
    features: [
      'Assured Shorthold Tenancy (AST) record keeping',
      'Rent receipts for HMRC & Housing Benefit',
      'Deposit tracking aligned to protection schemes',
      'Move-in inventory & condition photos',
      'Repair & maintenance request log',
    ],
    legalNote:
      'Most private rentals in England & Wales are Assured Shorthold Tenancies (ASTs). Deposits must be protected in a government-approved scheme within 30 days of receipt.',
    taxNote:
      'Landlords declare rental income via Self Assessment; rent receipts support HMRC records and tenant Housing Benefit claims. RentyBase timestamps every receipt.',
    agreementType: 'Assured Shorthold Tenancy (AST)',
    depositNote:
      'Deposits are capped at five weeks’ rent (annual rent under £50,000) and must be protected in TDP, DPS, or MyDeposits within 30 days, with prescribed information given to the tenant.',
    primaryLanguage: 'English',
    metaKeywords: [
      'landlord software uk',
      'AST tenancy agreement',
      'rent receipt uk',
      'deposit protection scheme',
      'rental management app uk',
    ],
    faqs: [
      {
        question: 'What is an Assured Shorthold Tenancy (AST)?',
        answer:
          'An AST is the most common form of private residential tenancy in England & Wales. It gives the tenant the right to live in the property for a fixed term, and the landlord the right to recover possession with the correct notice. RentyBase keeps the rent and deposit record for the whole tenancy.',
      },
      {
        question: 'Which deposit protection scheme should I use?',
        answer:
          'You must protect a deposit in one of three government-approved schemes — the Deposit Protection Service (DPS), MyDeposits, or the Tenancy Deposit Scheme (TDS) — within 30 days of receiving it, and give the tenant the prescribed information.',
      },
      {
        question: 'Is a deposit capped in the UK?',
        answer:
          'Yes. Under the Tenant Fees Act 2019, deposits are capped at five weeks’ rent where the annual rent is under £50,000, and six weeks’ rent above that.',
      },
      {
        question: 'Do landlords have to give rent receipts?',
        answer:
          'A tenant can request a written rent receipt, and it is good practice to provide one — particularly for tenants claiming Housing Benefit or Universal Credit. RentyBase generates a timestamped receipt for every payment.',
      },
      {
        question: 'Is RentyBase free for UK landlords and tenants?',
        answer:
          'Yes — rent tracking, receipts, deposit records, inventory photos, and repair logging are free for both landlords and tenants. No subscription required.',
      },
    ],
    cities: [
      { slug: 'london',     name: 'London',     region: 'England',  avgRent: 2100, neighborhoods: ['Shoreditch', 'Camden', 'Brixton', 'Greenwich'],        searchVolume: 'high' },
      { slug: 'manchester', name: 'Manchester', region: 'England',  avgRent: 1150, neighborhoods: ['Northern Quarter', 'Didsbury', 'Salford', 'Ancoats'],  searchVolume: 'high' },
      { slug: 'birmingham', name: 'Birmingham', region: 'England',  avgRent: 950,  neighborhoods: ['Digbeth', 'Edgbaston', 'Jewellery Quarter', 'Moseley'], searchVolume: 'high' },
      { slug: 'leeds',      name: 'Leeds',      region: 'England',  avgRent: 900,  neighborhoods: ['Headingley', 'Chapel Allerton', 'Hyde Park', 'Horsforth'], searchVolume: 'medium' },
      { slug: 'glasgow',    name: 'Glasgow',    region: 'Scotland', avgRent: 950,  neighborhoods: ['West End', 'Merchant City', 'Finnieston', 'Shawlands'], searchVolume: 'medium' },
      { slug: 'edinburgh',  name: 'Edinburgh',  region: 'Scotland', avgRent: 1250, neighborhoods: ['Leith', 'Stockbridge', 'Morningside', 'New Town'],      searchVolume: 'high' },
    ],
  },

  {
    code: 'AU',
    slug: 'au',
    name: 'Australia',
    valueProp:
      'Track rent, manage bonds, and keep rent receipts — free for Australian landlords and tenants.',
    features: [
      'Residential Tenancy Agreement record keeping',
      'Rental bond tracking & lodgement reference',
      'Rent receipts for ATO records',
      'Entry condition report photos',
      'Repair & maintenance request log',
    ],
    legalNote:
      'Residential tenancies are regulated state-by-state (e.g. NSW Fair Trading, Consumer Affairs Victoria). Bonds are lodged with the relevant state bond authority, not held by the landlord.',
    taxNote:
      'Landlords report rental income to the ATO and may claim deductions; tenants keep rent receipts as proof of payment. RentyBase timestamps every receipt.',
    agreementType: 'Residential Tenancy Agreement',
    depositNote:
      'Rental bonds are typically four weeks’ rent and must be lodged with the state bond authority (e.g. NSW Rental Bonds Online, the RTBA in Victoria). Disputes are heard at tribunals such as VCAT or NCAT.',
    primaryLanguage: 'English',
    metaKeywords: [
      'rental management app australia',
      'rental bond lodgement',
      'landlord software australia',
      'rent receipt australia',
      'VCAT bond',
    ],
    faqs: [
      {
        question: 'How do I lodge a rental bond?',
        answer:
          'A bond must be lodged with your state or territory bond authority — for example Rental Bonds Online in NSW or the Residential Tenancies Bond Authority (RTBA) in Victoria — not held directly by the landlord. RentyBase records the bond amount and lodgement reference alongside the tenancy.',
      },
      {
        question: 'How much can a landlord charge for a bond?',
        answer:
          'In most states the maximum bond is four weeks’ rent for general tenancies. Some states allow a higher bond where the weekly rent exceeds a set threshold.',
      },
      {
        question: 'What is VCAT / NCAT?',
        answer:
          'These are the state tribunals that resolve residential tenancy disputes — VCAT in Victoria, NCAT in New South Wales, and equivalents elsewhere. Clear records and entry condition photos help both sides; RentyBase keeps them timestamped.',
      },
      {
        question: 'Do landlords have to provide rent receipts?',
        answer:
          'Yes — if rent is paid in a way that does not otherwise create a record (such as cash), the landlord must provide a receipt. RentyBase generates a receipt for every logged payment automatically.',
      },
      {
        question: 'Is RentyBase free for Australian landlords and tenants?',
        answer:
          'Yes. Rent tracking, bond records, receipts, condition photos, and repair logs are all free for both sides — no subscription, no card.',
      },
    ],
    cities: [
      { slug: 'sydney',     name: 'Sydney',     region: 'New South Wales',   avgRent: 2800, neighborhoods: ['Bondi', 'Surry Hills', 'Newtown', 'Parramatta'],            searchVolume: 'high' },
      { slug: 'melbourne',  name: 'Melbourne',  region: 'Victoria',          avgRent: 2200, neighborhoods: ['Fitzroy', 'St Kilda', 'Carlton', 'Richmond'],               searchVolume: 'high' },
      { slug: 'brisbane',   name: 'Brisbane',   region: 'Queensland',        avgRent: 2100, neighborhoods: ['Fortitude Valley', 'West End', 'New Farm', 'South Brisbane'], searchVolume: 'high' },
      { slug: 'perth',      name: 'Perth',      region: 'Western Australia', avgRent: 2000, neighborhoods: ['Fremantle', 'Subiaco', 'Northbridge', 'Scarborough'],       searchVolume: 'medium' },
      { slug: 'adelaide',   name: 'Adelaide',   region: 'South Australia',   avgRent: 1800, neighborhoods: ['North Adelaide', 'Glenelg', 'Norwood', 'Unley'],             searchVolume: 'medium' },
      { slug: 'gold-coast', name: 'Gold Coast', region: 'Queensland',        avgRent: 2200, neighborhoods: ['Surfers Paradise', 'Broadbeach', 'Burleigh Heads', 'Southport'], searchVolume: 'medium' },
    ],
  },

  {
    code: 'CA',
    slug: 'ca',
    name: 'Canada',
    valueProp:
      'Track rent, manage deposits, and keep rent receipts for the CRA — free for Canadian landlords and tenants.',
    features: [
      'Lease agreement record keeping',
      'Rent receipts for CRA & provincial benefits',
      'Last month’s rent deposit tracking',
      'Move-in condition photo documentation',
      'Maintenance & repair request log',
    ],
    legalNote:
      'Residential tenancies are governed provincially (e.g. Ontario’s Residential Tenancies Act, BC’s RTB). Rules on deposits, rent increases, and notice differ by province.',
    taxNote:
      'Tenants may need rent receipts for provincial benefits such as the Ontario Trillium Benefit; landlords report rental income to the CRA. RentyBase timestamps every receipt.',
    agreementType: 'Lease Agreement',
    depositNote:
      'In Ontario, landlords may collect last month’s rent (LMR) as a deposit but not a separate damage deposit; other provinces such as BC allow a half-month security deposit. Rules vary by province.',
    primaryLanguage: 'English / French',
    metaKeywords: [
      'rental management app canada',
      'rent receipt canada',
      'landlord software canada',
      'last month rent deposit',
      'Ontario Trillium Benefit rent',
    ],
    faqs: [
      {
        question: 'Can a landlord ask for a damage deposit in Canada?',
        answer:
          'It depends on the province. Ontario does not allow a separate damage deposit — only last month’s rent (LMR). Provinces such as British Columbia allow a security deposit of up to half a month’s rent. RentyBase records whatever deposit applies.',
      },
      {
        question: 'Do I need rent receipts in Canada?',
        answer:
          'Yes — tenants often need rent receipts to claim provincial benefits like the Ontario Trillium Benefit, and a landlord must provide a receipt on request. RentyBase generates one for every logged payment.',
      },
      {
        question: 'How much notice is needed to end a tenancy?',
        answer:
          'Notice periods are set provincially and depend on the reason for ending the tenancy. Always check your provincial residential tenancies authority — RentyBase keeps the rent and communication record either way.',
      },
      {
        question: 'Are rent increases capped?',
        answer:
          'Several provinces set an annual rent-increase guideline (for example Ontario and BC). The cap and exemptions change yearly and vary by province, so check your provincial authority.',
      },
      {
        question: 'Is RentyBase free for Canadian landlords and tenants?',
        answer:
          'Yes — rent tracking, receipts, deposit records, condition photos, and repair logs are all free for both sides.',
      },
    ],
    cities: [
      { slug: 'toronto',   name: 'Toronto',   region: 'Ontario',          avgRent: 2500, neighborhoods: ['Downtown', 'North York', 'Scarborough', 'Etobicoke'], searchVolume: 'high' },
      { slug: 'vancouver', name: 'Vancouver', region: 'British Columbia', avgRent: 2800, neighborhoods: ['Kitsilano', 'Gastown', 'Yaletown', 'Mount Pleasant'], searchVolume: 'high' },
      { slug: 'montreal',  name: 'Montreal',  region: 'Quebec',           avgRent: 1700, neighborhoods: ['Plateau', 'Mile End', 'Griffintown', 'Verdun'],       searchVolume: 'high' },
      { slug: 'calgary',   name: 'Calgary',   region: 'Alberta',          avgRent: 1700, neighborhoods: ['Beltline', 'Kensington', 'Inglewood', 'Mission'],     searchVolume: 'medium' },
      { slug: 'edmonton',  name: 'Edmonton',  region: 'Alberta',          avgRent: 1400, neighborhoods: ['Oliver', 'Whyte Avenue', 'Garneau', 'Downtown'],      searchVolume: 'medium' },
      { slug: 'ottawa',    name: 'Ottawa',    region: 'Ontario',          avgRent: 1900, neighborhoods: ['Centretown', 'The Glebe', 'Westboro', 'ByWard Market'], searchVolume: 'medium' },
    ],
  },

  {
    code: 'AE',
    slug: 'ae',
    name: 'United Arab Emirates',
    valueProp:
      'Track rent, manage cheques, and keep digital rent receipts — free for UAE landlords and tenants.',
    features: [
      'Tenancy contract record keeping (Ejari-ready)',
      'Cheque & bank transfer payment logging',
      'Security deposit tracking',
      'Move-in condition photo documentation',
      'Maintenance & repair request log',
    ],
    legalNote:
      'Tenancy contracts in Dubai must be registered through Ejari (and Tawtheeq in Abu Dhabi). Rent disputes are handled by the relevant Rental Dispute Centre.',
    taxNote:
      'The UAE has no personal income tax on rent, but a clear digital record helps with contract renewals and dispute resolution. RentyBase timestamps every receipt.',
    agreementType: 'Ejari Tenancy Contract',
    depositNote:
      'Security deposits are typically 5% of annual rent for unfurnished units (often 10% for furnished), refundable at the end of the tenancy subject to condition.',
    primaryLanguage: 'English / Arabic',
    metaKeywords: [
      'rental management app dubai',
      'ejari tenancy contract',
      'rent receipt uae',
      'landlord app dubai',
      'tenancy contract uae',
    ],
    faqs: [
      {
        question: 'What is Ejari and do I need it?',
        answer:
          'Ejari is Dubai’s system for registering tenancy contracts, making them legally recognised. Registration is required for most government and utility processes. RentyBase keeps your rent record and contract details in one place alongside the Ejari reference.',
      },
      {
        question: 'How much is the security deposit in the UAE?',
        answer:
          'Security deposits are commonly 5% of the annual rent for unfurnished properties and around 10% for furnished ones, refundable at the end of the tenancy subject to the condition of the unit.',
      },
      {
        question: 'How is rent usually paid in the UAE?',
        answer:
          'Rent is traditionally paid with one to four post-dated cheques per year, though bank transfers are increasingly common. RentyBase logs each payment with its method and reference so both sides have a clear record.',
      },
      {
        question: 'Where are rental disputes resolved?',
        answer:
          'In Dubai, disputes go to the Rental Dispute Settlement Centre (RDSC); Abu Dhabi and other emirates have their own committees. Clear records and condition photos help — RentyBase keeps them timestamped.',
      },
      {
        question: 'Is RentyBase free for UAE landlords and tenants?',
        answer:
          'Yes — rent tracking, receipts, deposit records, condition photos, and repair logs are free for both sides.',
      },
    ],
    cities: [
      { slug: 'dubai',     name: 'Dubai',     region: 'Dubai',     avgRent: 7000, neighborhoods: ['Dubai Marina', 'Downtown Dubai', 'JLT', 'Business Bay'], searchVolume: 'high' },
      { slug: 'abu-dhabi', name: 'Abu Dhabi', region: 'Abu Dhabi', avgRent: 6000, neighborhoods: ['Al Reem Island', 'Khalifa City', 'Corniche', 'Yas Island'], searchVolume: 'high' },
      { slug: 'sharjah',   name: 'Sharjah',   region: 'Sharjah',   avgRent: 3500, neighborhoods: ['Al Nahda', 'Al Majaz', 'Muwaileh', 'Al Khan'],          searchVolume: 'medium' },
    ],
  },

  {
    code: 'SG',
    slug: 'sg',
    name: 'Singapore',
    valueProp:
      'Track rent, manage deposits, and keep digital rent receipts — free for Singapore landlords and tenants.',
    features: [
      'Tenancy Agreement record keeping',
      'Bank transfer & PayNow payment logging',
      'Security deposit tracking',
      'Move-in inventory & condition photos',
      'Maintenance & repair request log',
    ],
    legalNote:
      'Private residential tenancies in Singapore are governed by the tenancy agreement and common law. HDB sublets must comply with HDB rules and minimum occupation periods.',
    taxNote:
      'Landlords declare rental income to IRAS; a clear digital rent record simplifies filing and stamp duty records. RentyBase timestamps every receipt.',
    agreementType: 'Tenancy Agreement',
    depositNote:
      'Security deposits are typically one month’s rent per year of lease (e.g. one month for a one-year lease, two for a two-year lease), refundable at the end subject to condition.',
    primaryLanguage: 'English',
    metaKeywords: [
      'rental management app singapore',
      'tenancy agreement singapore',
      'rent receipt singapore',
      'landlord app singapore',
      'HDB rental record',
    ],
    faqs: [
      {
        question: 'How much security deposit is standard in Singapore?',
        answer:
          'A common rule of thumb is one month’s deposit for each year of the lease — one month for a one-year tenancy, two months for a two-year tenancy. It is refundable at the end of the lease subject to the condition of the unit.',
      },
      {
        question: 'Is stamp duty payable on a tenancy agreement?',
        answer:
          'Yes — tenancy agreements in Singapore attract stamp duty payable to IRAS, calculated on the rent and lease period. Keeping a clean rent record helps with renewal and filing; RentyBase stores it for you.',
      },
      {
        question: 'Can I rent out an HDB flat or room?',
        answer:
          'Subletting an HDB flat or bedroom is allowed only after meeting the Minimum Occupation Period and registering the sublet with HDB. RentyBase keeps the rent and tenant record once your sublet is approved.',
      },
      {
        question: 'How is rent usually paid?',
        answer:
          'Rent is commonly paid by bank transfer or PayNow. RentyBase logs each payment with its reference so both landlord and tenant see the same record.',
      },
      {
        question: 'Is RentyBase free for Singapore landlords and tenants?',
        answer:
          'Yes — rent tracking, receipts, deposit records, inventory photos, and repair logs are all free for both sides.',
      },
    ],
    cities: [
      { slug: 'central',   name: 'Central',   region: 'Central Region',    avgRent: 3500, neighborhoods: ['Orchard', 'River Valley', 'Tanjong Pagar', 'Bugis'], searchVolume: 'high' },
      { slug: 'east',      name: 'East',      region: 'East Region',       avgRent: 2800, neighborhoods: ['Tampines', 'Bedok', 'Katong', 'Pasir Ris'],         searchVolume: 'high' },
      { slug: 'west',      name: 'West',      region: 'West Region',       avgRent: 2600, neighborhoods: ['Jurong', 'Clementi', 'Bukit Batok', 'Choa Chu Kang'], searchVolume: 'medium' },
      { slug: 'north',     name: 'North',     region: 'North Region',      avgRent: 2400, neighborhoods: ['Woodlands', 'Yishun', 'Sembawang', 'Admiralty'],     searchVolume: 'medium' },
      { slug: 'northeast', name: 'Northeast', region: 'North-East Region', avgRent: 2600, neighborhoods: ['Punggol', 'Sengkang', 'Hougang', 'Serangoon'],      searchVolume: 'medium' },
    ],
  },

  {
    code: 'NZ',
    slug: 'nz',
    name: 'New Zealand',
    valueProp:
      'Track rent, manage bonds, and keep rent receipts — free for New Zealand landlords and tenants.',
    features: [
      'Residential Tenancy Agreement record keeping',
      'Bond lodgement reference tracking',
      'Rent receipts for IRD records',
      'Move-in property inspection photos',
      'Maintenance & repair request log',
    ],
    legalNote:
      'Residential tenancies are governed by the Residential Tenancies Act 1986 and overseen by Tenancy Services. Bonds are lodged with Tenancy Services, not held by the landlord.',
    taxNote:
      'Landlords declare rental income to Inland Revenue (IRD); tenants keep rent receipts as proof of payment. RentyBase timestamps every receipt.',
    agreementType: 'Tenancy Agreement',
    depositNote:
      'A bond of up to four weeks’ rent is common and must be lodged with Tenancy Services within 23 working days. Disputes are heard by the Tenancy Tribunal.',
    primaryLanguage: 'English',
    metaKeywords: [
      'rental management app new zealand',
      'bond lodgement nz',
      'rent receipt nz',
      'landlord app new zealand',
      'tenancy services bond',
    ],
    faqs: [
      {
        question: 'How do I lodge a bond in New Zealand?',
        answer:
          'A bond must be lodged with Tenancy Services within 23 working days of receiving it — it cannot be held by the landlord. RentyBase records the bond amount and lodgement reference alongside the tenancy.',
      },
      {
        question: 'How much bond can a landlord charge?',
        answer:
          'A landlord can ask for a bond of up to four weeks’ rent. It is refundable at the end of the tenancy subject to the condition of the property.',
      },
      {
        question: 'What is the Tenancy Tribunal?',
        answer:
          'The Tenancy Tribunal resolves disputes between landlords and tenants under the Residential Tenancies Act. Good records and inspection photos help both sides — RentyBase keeps them timestamped.',
      },
      {
        question: 'Do landlords have to give rent receipts?',
        answer:
          'A landlord must provide a receipt for rent paid in cash, and must keep records of rent received. RentyBase generates a receipt for every logged payment automatically.',
      },
      {
        question: 'Is RentyBase free for New Zealand landlords and tenants?',
        answer:
          'Yes — rent tracking, bond records, receipts, inspection photos, and repair logs are all free for both sides.',
      },
    ],
    cities: [
      { slug: 'auckland',     name: 'Auckland',     region: 'Auckland',      avgRent: 2600, neighborhoods: ['Ponsonby', 'Mount Eden', 'Newmarket', 'Takapuna'],     searchVolume: 'high' },
      { slug: 'wellington',   name: 'Wellington',   region: 'Wellington',    avgRent: 2400, neighborhoods: ['Te Aro', 'Mount Victoria', 'Newtown', 'Thorndon'],      searchVolume: 'high' },
      { slug: 'christchurch', name: 'Christchurch', region: 'Canterbury',    avgRent: 2000, neighborhoods: ['Riccarton', 'Addington', 'Merivale', 'Sumner'],         searchVolume: 'medium' },
      { slug: 'hamilton',     name: 'Hamilton',     region: 'Waikato',       avgRent: 1900, neighborhoods: ['Hamilton East', 'Chartwell', 'Rototuna', 'Frankton'],   searchVolume: 'low' },
      { slug: 'tauranga',     name: 'Tauranga',     region: 'Bay of Plenty', avgRent: 2100, neighborhoods: ['Mount Maunganui', 'Papamoa', 'Bethlehem', 'Greerton'],  searchVolume: 'low' },
    ],
  },

  {
    code: 'ZA',
    slug: 'za',
    name: 'South Africa',
    valueProp:
      'Track rent, manage deposits, and keep rent receipts — free for South African landlords and tenants.',
    features: [
      'Lease agreement record keeping',
      'EFT & debit order payment logging',
      'Deposit tracking with interest record',
      'Move-in incoming inspection photos',
      'Maintenance & repair request log',
    ],
    legalNote:
      'Residential leases are governed by the Rental Housing Act and the Consumer Protection Act. Deposits must be held in an interest-bearing account for the tenant’s benefit.',
    taxNote:
      'Landlords declare rental income to SARS; tenants keep rent receipts as proof of payment. RentyBase timestamps every receipt.',
    agreementType: 'Lease Agreement',
    depositNote:
      'Deposits are commonly one to two months’ rent and must be invested in an interest-bearing account; the interest accrues to the tenant and is paid out with the refund.',
    primaryLanguage: 'English',
    metaKeywords: [
      'rental management app south africa',
      'lease agreement south africa',
      'rent receipt south africa',
      'landlord app south africa',
      'rental housing act deposit',
    ],
    faqs: [
      {
        question: 'How must a rental deposit be held in South Africa?',
        answer:
          'Under the Rental Housing Act, the deposit must be invested in an interest-bearing account with a financial institution. The interest belongs to the tenant and is paid out together with the refundable balance at the end of the lease.',
      },
      {
        question: 'How much deposit can a landlord ask for?',
        answer:
          'The Act does not fix an amount — it is whatever the parties agree, commonly one to two months’ rent. RentyBase records the deposit and any deductions with proof.',
      },
      {
        question: 'Is an incoming inspection required?',
        answer:
          'Yes — the landlord and tenant should jointly inspect the property at the start of the lease and record its condition. Move-in photos protect both sides; RentyBase keeps them timestamped.',
      },
      {
        question: 'Do landlords need to issue rent receipts?',
        answer:
          'A tenant is entitled to a written receipt for rent paid. RentyBase generates one for every logged payment automatically.',
      },
      {
        question: 'Is RentyBase free for South African landlords and tenants?',
        answer:
          'Yes — rent tracking, receipts, deposit records, inspection photos, and repair logs are all free for both sides.',
      },
    ],
    cities: [
      { slug: 'cape-town',      name: 'Cape Town',      region: 'Western Cape',  avgRent: 12000, neighborhoods: ['Sea Point', 'Claremont', 'Observatory', 'Woodstock'], searchVolume: 'high' },
      { slug: 'johannesburg',   name: 'Johannesburg',   region: 'Gauteng',       avgRent: 10000, neighborhoods: ['Sandton', 'Rosebank', 'Melville', 'Maboneng'],        searchVolume: 'high' },
      { slug: 'durban',         name: 'Durban',         region: 'KwaZulu-Natal', avgRent: 8000,  neighborhoods: ['Umhlanga', 'Morningside', 'Berea', 'Glenwood'],        searchVolume: 'medium' },
      { slug: 'pretoria',       name: 'Pretoria',       region: 'Gauteng',       avgRent: 8500,  neighborhoods: ['Hatfield', 'Brooklyn', 'Menlyn', 'Centurion'],         searchVolume: 'medium' },
      { slug: 'port-elizabeth', name: 'Port Elizabeth', region: 'Eastern Cape',  avgRent: 7000,  neighborhoods: ['Summerstrand', 'Walmer', 'Newton Park', 'Humewood'],   searchVolume: 'low' },
    ],
  },

  {
    code: 'MY',
    slug: 'my',
    name: 'Malaysia',
    valueProp:
      'Track rent, manage deposits, and keep digital rent receipts — free for Malaysian landlords and tenants.',
    features: [
      'Tenancy Agreement record keeping',
      'Online banking & DuitNow payment logging',
      'Security & utility deposit tracking',
      'Move-in condition photo documentation',
      'Maintenance & repair request log',
    ],
    legalNote:
      'Residential tenancies are governed by the tenancy agreement and contract law (there is no dedicated Residential Tenancy Act yet). Agreements are typically stamped at LHDN.',
    taxNote:
      'Landlords declare rental income to LHDN (Inland Revenue Board); a clear digital rent record simplifies filing. RentyBase timestamps every receipt.',
    agreementType: 'Tenancy Agreement',
    depositNote:
      'A security deposit of about two months’ rent plus a half-month utility deposit is standard, refundable at the end of the tenancy subject to condition.',
    primaryLanguage: 'English / Malay',
    metaKeywords: [
      'rental management app malaysia',
      'tenancy agreement malaysia',
      'rent receipt malaysia',
      'landlord app malaysia',
      'rental deposit malaysia',
    ],
    faqs: [
      {
        question: 'How much deposit is standard in Malaysia?',
        answer:
          'A common arrangement is two months’ rent as a security deposit plus a half-month utility deposit, and sometimes a half-month advance rental. All are refundable at the end of the tenancy subject to condition. RentyBase records each deposit and any deductions.',
      },
      {
        question: 'Does a tenancy agreement need to be stamped?',
        answer:
          'Yes — tenancy agreements are stamped at LHDN (the Inland Revenue Board) to be admissible as evidence. Keeping a clean rent record helps at renewal; RentyBase stores it for you.',
      },
      {
        question: 'Is there a dedicated tenancy law in Malaysia?',
        answer:
          'Not yet — residential tenancies are governed by the agreement and general contract law, so a clear written agreement and rent record matter. RentyBase keeps the rent, deposit, and condition record for the whole tenancy.',
      },
      {
        question: 'How is rent usually paid?',
        answer:
          'Rent is commonly paid by online banking transfer or DuitNow. RentyBase logs each payment with its reference so both landlord and tenant see the same record.',
      },
      {
        question: 'Is RentyBase free for Malaysian landlords and tenants?',
        answer:
          'Yes — rent tracking, receipts, deposit records, condition photos, and repair logs are all free for both sides.',
      },
    ],
    cities: [
      { slug: 'kuala-lumpur', name: 'Kuala Lumpur', region: 'Federal Territory', avgRent: 2000, neighborhoods: ['Bukit Bintang', 'Mont Kiara', 'Bangsar', 'KLCC'],      searchVolume: 'high' },
      { slug: 'penang',       name: 'Penang',       region: 'Penang',            avgRent: 1500, neighborhoods: ['George Town', 'Gurney', 'Bayan Lepas', 'Tanjung Bungah'], searchVolume: 'medium' },
      { slug: 'johor-bahru',  name: 'Johor Bahru',  region: 'Johor',             avgRent: 1400, neighborhoods: ['Iskandar Puteri', 'Skudai', 'Mount Austin', 'Bukit Indah'], searchVolume: 'medium' },
      { slug: 'kota-kinabalu', name: 'Kota Kinabalu', region: 'Sabah',           avgRent: 1300, neighborhoods: ['Likas', 'Penampang', 'Luyang', 'Sembulan'],            searchVolume: 'low' },
    ],
  },
];

// ─── Featured cities (homepage + /rentals index strip) ────────────────────────
// Hand-picked global mix for the "available worldwide" surface.

export const FEATURED_CITIES: { country: string; city: string }[] = [
  { country: 'in', city: 'mumbai' },
  { country: 'in', city: 'delhi' },
  { country: 'gb', city: 'london' },
  { country: 'us', city: 'new-york' },
  { country: 'au', city: 'sydney' },
  { country: 'ae', city: 'dubai' },
  { country: 'sg', city: 'central' },
  { country: 'ca', city: 'toronto' },
  { country: 'in', city: 'bangalore' },
  { country: 'gb', city: 'manchester' },
  { country: 'us', city: 'los-angeles' },
  { country: 'au', city: 'melbourne' },
];

// ─── Derived totals ───────────────────────────────────────────────────────────

export const TOTAL_CITIES = SEO_COUNTRIES.reduce((n, c) => n + c.cities.length, 0);
export const TOTAL_COUNTRIES = SEO_COUNTRIES.length;

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getSeoCountry(slug: string): SeoCountry | undefined {
  return SEO_COUNTRIES.find(c => c.slug === slug.toLowerCase());
}

export function getSeoCity(
  countrySlug: string,
  citySlug: string,
): { country: SeoCountry; city: SeoCity } | undefined {
  const country = getSeoCountry(countrySlug);
  if (!country) return undefined;
  const city = country.cities.find(ci => ci.slug === citySlug.toLowerCase());
  if (!city) return undefined;
  return { country, city };
}

/** Other cities in the same country, excluding the given one (proxy for "nearby"). */
export function getNearbyCities(countrySlug: string, citySlug: string, limit = 5): SeoCity[] {
  const country = getSeoCountry(countrySlug);
  if (!country) return [];
  return country.cities.filter(c => c.slug !== citySlug.toLowerCase()).slice(0, limit);
}

// ─── generateStaticParams sources ─────────────────────────────────────────────

export function getAllCountryParams(): { country: string }[] {
  return SEO_COUNTRIES.map(c => ({ country: c.slug }));
}

export function getAllCityParams(): { country: string; city: string }[] {
  return SEO_COUNTRIES.flatMap(c => c.cities.map(ci => ({ country: c.slug, city: ci.slug })));
}
