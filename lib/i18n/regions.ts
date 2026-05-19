// ─── Region Registry ──────────────────────────────────────────────────────────
// Single source of truth for all country/region configuration.
// Add new countries here — nothing else needs to change.

export type CountryCode = 'IN' | 'US' | 'GB' | 'CA' | 'AU' | 'AE' | 'SG' | 'DE' | 'FR' | 'NZ';

export type PaymentMethodId =
  | 'upi'          // India: UPI (PhonePe / GPay / Paytm)
  | 'bank_transfer' // Generic bank-to-bank
  | 'neft'         // India: NEFT / IMPS
  | 'zelle'        // US: Zelle P2P
  | 'ach'          // US/CA: ACH bank transfer
  | 'wire'         // Wire transfer
  | 'check'        // US: physical check
  | 'cheque'       // IN/GB/AU: physical cheque
  | 'cash'
  | 'credit_card'
  | 'direct_debit' // GB/AU: direct debit
  | 'faster_payments'; // GB: Faster Payments

export interface CurrencyConfig {
  code: string;       // ISO 4217
  symbol: string;
  name: string;
  decimals: number;   // 0 for INR display, 2 for USD
  compactK: string;   // abbreviation for thousands (K)
  compactM: string;   // abbreviation for millions (M or L for India)
  compactB?: string;  // abbreviation for billions
}

export interface RegionConfig {
  countryCode: CountryCode;
  name: string;
  flag: string;          // emoji flag
  currency: CurrencyConfig;
  locale: string;        // BCP-47 locale (e.g. 'en-US')
  primaryTimezone: string;
  phoneDialCode: string; // e.g. '+1', '+91'
  phoneLocalLength: number[]; // valid local digit counts
  postalCodeLabel: string;
  postalCodePlaceholder: string;
  stateLabel: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  paymentMethods: PaymentMethodId[];
  minRentAmount: number;  // in base currency
  taxIdLabel: string | null;
  taxIdPlaceholder: string | null;
  measurementSystem: 'metric' | 'imperial';
  rentTerminology: string; // 'rent', 'rent' (same globally, but extensible)
  receiptLabel: string;    // 'HRA Receipt' vs 'Rent Receipt'
  receiptFootnote: string | null; // India: 'SEC 10(13A)' | US: null
}

// ─── Currency definitions ─────────────────────────────────────────────────────

const INR: CurrencyConfig = { code: 'INR', symbol: '₹', name: 'Indian Rupee',   decimals: 0, compactK: 'K', compactM: 'L', compactB: 'Cr' };
const USD: CurrencyConfig = { code: 'USD', symbol: '$', name: 'US Dollar',       decimals: 2, compactK: 'K', compactM: 'M', compactB: 'B'  };
const GBP: CurrencyConfig = { code: 'GBP', symbol: '£', name: 'British Pound',   decimals: 2, compactK: 'K', compactM: 'M' };
const CAD: CurrencyConfig = { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2, compactK: 'K', compactM: 'M' };
const AUD: CurrencyConfig = { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, compactK: 'K', compactM: 'M' };
const AED: CurrencyConfig = { code: 'AED', symbol: 'AED', name: 'UAE Dirham',    decimals: 2, compactK: 'K', compactM: 'M' };
const SGD: CurrencyConfig = { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, compactK: 'K', compactM: 'M' };
const EUR: CurrencyConfig = { code: 'EUR', symbol: '€', name: 'Euro',            decimals: 2, compactK: 'K', compactM: 'M' };
const NZD: CurrencyConfig = { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2, compactK: 'K', compactM: 'M' };

// ─── Region registry ──────────────────────────────────────────────────────────

export const REGIONS: Record<CountryCode, RegionConfig> = {

  US: {
    countryCode: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: USD,
    locale: 'en-US',
    primaryTimezone: 'America/New_York',
    phoneDialCode: '+1',
    phoneLocalLength: [10],
    postalCodeLabel: 'ZIP Code',
    postalCodePlaceholder: '10001',
    stateLabel: 'State',
    dateFormat: 'MM/DD/YYYY',
    paymentMethods: ['zelle', 'ach', 'check', 'cash', 'credit_card'],
    minRentAmount: 100,
    taxIdLabel: null,
    taxIdPlaceholder: null,
    measurementSystem: 'imperial',
    rentTerminology: 'rent',
    receiptLabel: 'Rent Receipt',
    receiptFootnote: null,
  },

  IN: {
    countryCode: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: INR,
    locale: 'en-IN',
    primaryTimezone: 'Asia/Kolkata',
    phoneDialCode: '+91',
    phoneLocalLength: [10],
    postalCodeLabel: 'PIN Code',
    postalCodePlaceholder: '400001',
    stateLabel: 'State',
    dateFormat: 'DD/MM/YYYY',
    paymentMethods: ['upi', 'neft', 'cash', 'cheque'],
    minRentAmount: 500,
    taxIdLabel: 'PAN Number',
    taxIdPlaceholder: 'ABCDE1234F',
    measurementSystem: 'metric',
    rentTerminology: 'rent',
    receiptLabel: 'HRA Receipt',
    receiptFootnote: 'SEC 10(13A)',
  },

  GB: {
    countryCode: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: GBP,
    locale: 'en-GB',
    primaryTimezone: 'Europe/London',
    phoneDialCode: '+44',
    phoneLocalLength: [10],
    postalCodeLabel: 'Postcode',
    postalCodePlaceholder: 'SW1A 1AA',
    stateLabel: 'County',
    dateFormat: 'DD/MM/YYYY',
    paymentMethods: ['faster_payments', 'direct_debit', 'bank_transfer', 'cheque', 'cash'],
    minRentAmount: 100,
    taxIdLabel: 'NI Number',
    taxIdPlaceholder: 'AA 12 34 56 A',
    measurementSystem: 'imperial',
    rentTerminology: 'rent',
    receiptLabel: 'Rent Receipt',
    receiptFootnote: null,
  },

  CA: {
    countryCode: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currency: CAD,
    locale: 'en-CA',
    primaryTimezone: 'America/Toronto',
    phoneDialCode: '+1',
    phoneLocalLength: [10],
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: 'K1A 0A9',
    stateLabel: 'Province',
    dateFormat: 'MM/DD/YYYY',
    paymentMethods: ['ach', 'bank_transfer', 'check', 'cash', 'credit_card'],
    minRentAmount: 100,
    taxIdLabel: 'SIN',
    taxIdPlaceholder: '123 456 789',
    measurementSystem: 'metric',
    rentTerminology: 'rent',
    receiptLabel: 'Rent Receipt',
    receiptFootnote: null,
  },

  AU: {
    countryCode: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    currency: AUD,
    locale: 'en-AU',
    primaryTimezone: 'Australia/Sydney',
    phoneDialCode: '+61',
    phoneLocalLength: [9, 10],
    postalCodeLabel: 'Postcode',
    postalCodePlaceholder: '2000',
    stateLabel: 'State / Territory',
    dateFormat: 'DD/MM/YYYY',
    paymentMethods: ['direct_debit', 'bank_transfer', 'cheque', 'cash'],
    minRentAmount: 50,
    taxIdLabel: 'TFN',
    taxIdPlaceholder: '123 456 789',
    measurementSystem: 'metric',
    rentTerminology: 'rent',
    receiptLabel: 'Rent Receipt',
    receiptFootnote: null,
  },

  AE: {
    countryCode: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currency: AED,
    locale: 'en-AE',
    primaryTimezone: 'Asia/Dubai',
    phoneDialCode: '+971',
    phoneLocalLength: [9],
    postalCodeLabel: 'P.O. Box',
    postalCodePlaceholder: '123456',
    stateLabel: 'Emirate',
    dateFormat: 'DD/MM/YYYY',
    paymentMethods: ['bank_transfer', 'cash', 'cheque'],
    minRentAmount: 500,
    taxIdLabel: null,
    taxIdPlaceholder: null,
    measurementSystem: 'metric',
    rentTerminology: 'rent',
    receiptLabel: 'Rent Receipt',
    receiptFootnote: null,
  },

  SG: {
    countryCode: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    currency: SGD,
    locale: 'en-SG',
    primaryTimezone: 'Asia/Singapore',
    phoneDialCode: '+65',
    phoneLocalLength: [8],
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '018956',
    stateLabel: 'Region',
    dateFormat: 'DD/MM/YYYY',
    paymentMethods: ['bank_transfer', 'cash'],
    minRentAmount: 100,
    taxIdLabel: null,
    taxIdPlaceholder: null,
    measurementSystem: 'metric',
    rentTerminology: 'rent',
    receiptLabel: 'Rent Receipt',
    receiptFootnote: null,
  },

  DE: {
    countryCode: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    currency: EUR,
    locale: 'de-DE',
    primaryTimezone: 'Europe/Berlin',
    phoneDialCode: '+49',
    phoneLocalLength: [10, 11],
    postalCodeLabel: 'PLZ',
    postalCodePlaceholder: '10115',
    stateLabel: 'Bundesland',
    dateFormat: 'DD/MM/YYYY',
    paymentMethods: ['bank_transfer', 'direct_debit', 'cash'],
    minRentAmount: 100,
    taxIdLabel: null,
    taxIdPlaceholder: null,
    measurementSystem: 'metric',
    rentTerminology: 'rent',
    receiptLabel: 'Rent Receipt',
    receiptFootnote: null,
  },

  FR: {
    countryCode: 'FR',
    name: 'France',
    flag: '🇫🇷',
    currency: EUR,
    locale: 'fr-FR',
    primaryTimezone: 'Europe/Paris',
    phoneDialCode: '+33',
    phoneLocalLength: [9, 10],
    postalCodeLabel: 'Code postal',
    postalCodePlaceholder: '75001',
    stateLabel: 'Département',
    dateFormat: 'DD/MM/YYYY',
    paymentMethods: ['bank_transfer', 'direct_debit', 'cash'],
    minRentAmount: 100,
    taxIdLabel: null,
    taxIdPlaceholder: null,
    measurementSystem: 'metric',
    rentTerminology: 'rent',
    receiptLabel: 'Rent Receipt',
    receiptFootnote: null,
  },

  NZ: {
    countryCode: 'NZ',
    name: 'New Zealand',
    flag: '🇳🇿',
    currency: NZD,
    locale: 'en-NZ',
    primaryTimezone: 'Pacific/Auckland',
    phoneDialCode: '+64',
    phoneLocalLength: [8, 9],
    postalCodeLabel: 'Postcode',
    postalCodePlaceholder: '1010',
    stateLabel: 'Region',
    dateFormat: 'DD/MM/YYYY',
    paymentMethods: ['bank_transfer', 'cash'],
    minRentAmount: 50,
    taxIdLabel: null,
    taxIdPlaceholder: null,
    measurementSystem: 'metric',
    rentTerminology: 'rent',
    receiptLabel: 'Rent Receipt',
    receiptFootnote: null,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getRegion = (code: CountryCode | string | null | undefined): RegionConfig => {
  if (code && code in REGIONS) return REGIONS[code as CountryCode];
  return REGIONS['IN']; // backward-compatible default
};

export const ALL_COUNTRIES = Object.values(REGIONS);

// Sorted for the picker: US first (new primary), then India (legacy), rest alphabetically
export const COUNTRY_PICKER_ORDER: CountryCode[] = [
  'US', 'IN', 'GB', 'CA', 'AU', 'AE', 'SG', 'DE', 'FR', 'NZ',
];
