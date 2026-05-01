import React from 'react';
import { View, Text } from 'react-native';
import {
  RentalStatus,
  PaymentStatus,
  RepairStatus,
  ProofStatus,
} from '../../types';
import {
  rentalStatusLabel,
  paymentStatusLabel,
  repairStatusLabel,
  proofStatusLabel,
} from '../../lib/formatters';

type StatusType =
  | { kind: 'rental'; value: RentalStatus }
  | { kind: 'payment'; value: PaymentStatus }
  | { kind: 'repair'; value: RepairStatus }
  | { kind: 'proof'; value: ProofStatus };

const rentalColors: Record<RentalStatus, string> = {
  active: 'bg-emerald-50 text-success',
  pending_tenant: 'bg-amber-50 text-warning',
  pending_proof: 'bg-blue-50 text-action',
  ended: 'bg-gray-100 text-muted',
};

const paymentColors: Record<PaymentStatus, string> = {
  paid: 'bg-emerald-50 text-success',
  pending: 'bg-amber-50 text-warning',
  overdue: 'bg-red-50 text-danger',
  partial: 'bg-blue-50 text-action',
};

const repairColors: Record<RepairStatus, string> = {
  open: 'bg-red-50 text-danger',
  in_progress: 'bg-amber-50 text-warning',
  resolved: 'bg-emerald-50 text-success',
  closed: 'bg-gray-100 text-muted',
};

const proofColors: Record<ProofStatus, string> = {
  pending: 'bg-amber-50 text-warning',
  approved: 'bg-emerald-50 text-success',
  rejected: 'bg-red-50 text-danger',
  dispute: 'bg-purple-50 text-purple-600',
};

export const StatusPill: React.FC<StatusType> = (props) => {
  let label = '';
  let colorClass = '';

  if (props.kind === 'rental') {
    label = rentalStatusLabel[props.value];
    colorClass = rentalColors[props.value];
  } else if (props.kind === 'payment') {
    label = paymentStatusLabel[props.value];
    colorClass = paymentColors[props.value];
  } else if (props.kind === 'repair') {
    label = repairStatusLabel[props.value];
    colorClass = repairColors[props.value];
  } else {
    label = proofStatusLabel[props.value];
    colorClass = proofColors[props.value];
  }

  return (
    <View className={`rounded-full px-2.5 py-0.5 self-start ${colorClass.split(' ')[0]}`}>
      <Text className={`text-xs font-semibold ${colorClass.split(' ')[1]}`}>{label}</Text>
    </View>
  );
};
