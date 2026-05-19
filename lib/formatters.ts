// ─── Formatters ───────────────────────────────────────────────────────────────
// All public functions keep their original signatures for full backward compat.
// Internally they read the current region from regionStore (outside React is fine
// with Zustand's getState()). Callers can also pass an explicit locale/currency.

import { PaymentStatus, RentalStatus, RepairStatus, RepairPriority, ProofStatus } from '../types';
import { formatCurrencyLocale, formatDateLocale, formatDateShortLocale, formatMonthLocale, formatPhoneLocale, normalizePhoneLocale } from './i18n/formatters';
import { getRegion } from './i18n/regions';

// Lazy-import the store to avoid circular deps at module load time.
// regionStore → formatters would be circular; this breaks the cycle.
const getRegionConfig = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useRegionStore } = require('../stores/regionStore') as typeof import('../stores/regionStore');
    return useRegionStore.getState().regionConfig;
  } catch {
    return getRegion('IN');
  }
};

// ─── Currency ─────────────────────────────────────────────────────────────────

export const formatCurrency = (amount: number, compact = false): string => {
  const r = getRegionConfig();
  return formatCurrencyLocale(amount, r.currency, r.locale, compact);
};

// Explicit locale override — used by screens that want to display a specific currency
// regardless of the user's global region setting (e.g. property details in another country).
export const formatCurrencyFor = (amount: number, countryCode: string, compact = false): string => {
  const r = getRegion(countryCode);
  return formatCurrencyLocale(amount, r.currency, r.locale, compact);
};

// ─── Dates ────────────────────────────────────────────────────────────────────

export const formatDate = (iso: string): string => {
  const r = getRegionConfig();
  return formatDateLocale(iso, r.locale);
};

export const formatDateShort = (iso: string): string => {
  const r = getRegionConfig();
  return formatDateShortLocale(iso, r.locale);
};

export const formatMonth = (iso: string): string => {
  const r = getRegionConfig();
  return formatMonthLocale(iso, r.locale);
};

export const formatRelativeTime = (iso: string): string => {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
};

export const monthKey = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
};

// ─── Phone ────────────────────────────────────────────────────────────────────

export const formatPhone = (phone: string | null | undefined): string => {
  const r = getRegionConfig();
  return formatPhoneLocale(phone, r.phoneDialCode, r.phoneLocalLength);
};

export const normalizePhone = (phone: string): string => {
  const r = getRegionConfig();
  return normalizePhoneLocale(phone, r.phoneDialCode, r.phoneLocalLength);
};

// ─── Status labels ────────────────────────────────────────────────────────────

export const rentalStatusLabel: Record<RentalStatus, string> = {
  active: 'Active',
  pending_tenant: 'Awaiting Tenant',
  pending_proof: 'Proof Pending',
  pending_moveout: 'Move-out',
  ended: 'Ended',
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  paid: 'Paid',
  pending: 'Due',
  overdue: 'Overdue',
  partial: 'Partial',
  pending_verification: 'Confirm',
};

export const repairStatusLabel: Record<RepairStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const repairPriorityLabel: Record<RepairPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const proofStatusLabel: Record<ProofStatus, string> = {
  pending: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  dispute: 'Disputed',
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const getInitials = (name: string): string => {
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
};

export const pluralize = (count: number, word: string, plural?: string): string => {
  return count === 1 ? `${count} ${word}` : `${count} ${plural ?? word + 's'}`;
};
