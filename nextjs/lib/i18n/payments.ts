// ─── Payment method registry ──────────────────────────────────────────────────
// Maps PaymentMethodId → display config so pay-rent.tsx renders correctly for any region.

import type { PaymentMethodId } from './regions';
export type { PaymentMethodId } from './regions';

export interface PaymentMethodDisplay {
  id: PaymentMethodId;
  label: string;
  description: string;
  icon: string;            // Ionicons name
  supportsInstantApp: boolean;  // true → show "Open App" UPI-style flow
  referenceLabel: string;
  referencePlaceholder: string;
  settlementTime: string;  // human description for the UI
}

export const PAYMENT_METHOD_DISPLAY: Record<PaymentMethodId, PaymentMethodDisplay> = {
  upi: {
    id: 'upi',
    label: 'UPI',
    description: 'Pay instantly via PhonePe, GPay, or Paytm',
    icon: 'flash-outline',
    supportsInstantApp: true,
    referenceLabel: 'UTR Number',
    referencePlaceholder: '12-digit UTR',
    settlementTime: 'Instant',
  },
  neft: {
    id: 'neft',
    label: 'NEFT / IMPS',
    description: 'Bank transfer via NEFT or IMPS',
    icon: 'business-outline',
    supportsInstantApp: false,
    referenceLabel: 'UTR / Reference No.',
    referencePlaceholder: 'NEFT / IMPS reference',
    settlementTime: '30 min – 2 hours',
  },
  bank_transfer: {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    description: 'Direct bank-to-bank transfer',
    icon: 'business-outline',
    supportsInstantApp: false,
    referenceLabel: 'Reference No.',
    referencePlaceholder: 'Transfer reference',
    settlementTime: '1 – 3 business days',
  },
  zelle: {
    id: 'zelle',
    label: 'Zelle',
    description: 'Instant P2P transfer via Zelle',
    icon: 'flash-outline',
    supportsInstantApp: false,
    referenceLabel: 'Confirmation Code',
    referencePlaceholder: 'Zelle confirmation',
    settlementTime: 'Minutes',
  },
  ach: {
    id: 'ach',
    label: 'ACH Bank Transfer',
    description: 'Automated bank transfer (ACH)',
    icon: 'business-outline',
    supportsInstantApp: false,
    referenceLabel: 'Trace Number',
    referencePlaceholder: 'ACH trace number',
    settlementTime: '1 – 3 business days',
  },
  wire: {
    id: 'wire',
    label: 'Wire Transfer',
    description: 'Domestic or international wire',
    icon: 'business-outline',
    supportsInstantApp: false,
    referenceLabel: 'Wire Reference',
    referencePlaceholder: 'Wire reference number',
    settlementTime: 'Same day',
  },
  check: {
    id: 'check',
    label: 'Check',
    description: 'Physical check by mail or in person',
    icon: 'document-text-outline',
    supportsInstantApp: false,
    referenceLabel: 'Check Number',
    referencePlaceholder: 'Check #1234',
    settlementTime: '2 – 5 business days',
  },
  cheque: {
    id: 'cheque',
    label: 'Cheque',
    description: 'Physical cheque',
    icon: 'document-text-outline',
    supportsInstantApp: false,
    referenceLabel: 'Cheque Number',
    referencePlaceholder: 'Cheque #1234',
    settlementTime: '2 – 5 days',
  },
  cash: {
    id: 'cash',
    label: 'Cash',
    description: 'In-person cash payment',
    icon: 'cash-outline',
    supportsInstantApp: false,
    referenceLabel: 'Note',
    referencePlaceholder: 'e.g. Paid at property on 1st May',
    settlementTime: 'Instant',
  },
  credit_card: {
    id: 'credit_card',
    label: 'Credit / Debit Card',
    description: 'Card payment',
    icon: 'card-outline',
    supportsInstantApp: false,
    referenceLabel: 'Auth Code',
    referencePlaceholder: 'Authorization code',
    settlementTime: '1 – 2 business days',
  },
  faster_payments: {
    id: 'faster_payments',
    label: 'Faster Payments',
    description: 'UK Faster Payments bank transfer',
    icon: 'flash-outline',
    supportsInstantApp: false,
    referenceLabel: 'Reference',
    referencePlaceholder: 'Payment reference',
    settlementTime: 'Seconds',
  },
  direct_debit: {
    id: 'direct_debit',
    label: 'Direct Debit',
    description: 'Recurring direct debit mandate',
    icon: 'repeat-outline',
    supportsInstantApp: false,
    referenceLabel: 'Mandate Reference',
    referencePlaceholder: 'DD mandate reference',
    settlementTime: '3 – 5 business days',
  },
};

// UPI apps shown for India's instant-app payment flow
export const UPI_APPS = [
  { id: 'phonepe' as const, name: 'PhonePe',    color: '#5F259F', abbr: 'PP' },
  { id: 'gpay'    as const, name: 'Google Pay', color: '#4285F4', abbr: 'G'  },
  { id: 'paytm'   as const, name: 'Paytm',      color: '#00BAF2', abbr: 'P'  },
];
export type UpiAppId = typeof UPI_APPS[number]['id'];
