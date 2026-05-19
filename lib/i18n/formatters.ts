// ─── Locale-aware pure formatting utilities ───────────────────────────────────
// These are stateless functions that take explicit locale/currency params.
// lib/formatters.ts delegates to these after injecting region from the store.

import { CurrencyConfig } from './regions';

// ─── Currency ─────────────────────────────────────────────────────────────────

export const formatCurrencyLocale = (
  amount: number,
  currency: CurrencyConfig,
  locale: string,
  compact = false,
): string => {
  if (compact) {
    const { compactK, compactM, compactB } = currency;
    // India uses Lakh (100K) as a major threshold
    if (locale.startsWith('en-IN') && amount >= 10_000_000) {
      return `${currency.symbol}${(amount / 10_000_000).toFixed(1)}${compactB ?? 'Cr'}`;
    }
    if (locale.startsWith('en-IN') && amount >= 100_000) {
      return `${currency.symbol}${(amount / 100_000).toFixed(1)}${compactM}`;
    }
    if (amount >= 1_000_000_000 && compactB) {
      return `${currency.symbol}${(amount / 1_000_000_000).toFixed(1)}${compactB}`;
    }
    if (amount >= 1_000_000) {
      return `${currency.symbol}${(amount / 1_000_000).toFixed(1)}${compactM}`;
    }
    if (amount >= 1_000) {
      return `${currency.symbol}${(amount / 1_000).toFixed(1)}${compactK}`;
    }
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.code,
    maximumFractionDigits: currency.decimals,
    minimumFractionDigits: currency.decimals,
  }).format(amount);
};

// ─── Dates ────────────────────────────────────────────────────────────────────

export const formatDateLocale = (iso: string, locale: string): string =>
  new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const formatDateShortLocale = (iso: string, locale: string): string =>
  new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });

export const formatMonthLocale = (iso: string, locale: string): string =>
  new Date(iso).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

export const formatTimeLocale = (date: Date, locale: string): string =>
  date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !locale.startsWith('de') && !locale.startsWith('fr'),
  });

// ─── Phone ────────────────────────────────────────────────────────────────────

export const formatPhoneLocale = (
  phone: string | null | undefined,
  dialCode: string,
  localLength: number[],
): string => {
  if (!phone) return 'Phone not set';
  const digits = phone.replace(/\D/g, '');
  const dialDigits = dialCode.replace(/\D/g, '');
  const maxLen = Math.max(...localLength);

  // Already has country prefix
  if (digits.startsWith(dialDigits) && digits.length === dialDigits.length + maxLen) {
    const local = digits.slice(dialDigits.length);
    return `${dialCode} ${formatLocalDigits(local, dialCode)}`;
  }

  // Local number only
  if (localLength.includes(digits.length)) {
    return `${dialCode} ${formatLocalDigits(digits, dialCode)}`;
  }

  return phone; // unknown format — return as-is
};

export const normalizePhoneLocale = (
  phone: string,
  dialCode: string,
  localLength: number[],
): string => {
  const digits = phone.replace(/\D/g, '');
  const dialDigits = dialCode.replace(/\D/g, '');
  const maxLen = Math.max(...localLength);

  if (localLength.includes(digits.length)) return `${dialCode}${digits}`;

  if (digits.startsWith('0') && localLength.includes(digits.length - 1)) {
    return `${dialCode}${digits.slice(1)}`;
  }

  if (digits.startsWith(dialDigits) && localLength.includes(digits.length - dialDigits.length)) {
    return `+${digits}`;
  }

  return phone;
};

// Format local digits with regional spacing conventions
const formatLocalDigits = (digits: string, dialCode: string): string => {
  if (dialCode === '+1' && digits.length === 10) {
    // North American: (555) 867-5309
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (dialCode === '+91' && digits.length === 10) {
    // India: 98765 43210
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (dialCode === '+44' && digits.length === 10) {
    // UK: 07xxx xxxxxx
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  // Generic: split in halves
  const mid = Math.floor(digits.length / 2);
  return `${digits.slice(0, mid)} ${digits.slice(mid)}`;
};
