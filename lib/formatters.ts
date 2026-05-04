import { PaymentStatus, RentalStatus, RepairStatus, RepairPriority, ProofStatus } from '../types';

// ─── Currency ─────────────────────────────────────────────────────────────────

export const formatCurrency = (amount: number, compact = false): string => {
  if (compact && amount >= 100000) {
    return `Rs ${(amount / 100000).toFixed(1)}L`;
  }
  if (compact && amount >= 1000) {
    return `Rs ${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// ─── Dates ────────────────────────────────────────────────────────────────────

export const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateShort = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

export const formatMonth = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
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
  if (!phone) return 'Phone not set';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
};

export const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
  return phone;
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
