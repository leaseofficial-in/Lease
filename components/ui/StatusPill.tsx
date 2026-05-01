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
  active: 'bg-successSoft text-success',
  pending_tenant: 'bg-warningSoft text-warning',
  pending_proof: 'bg-actionSoft text-action',
  ended: 'bg-fill text-muted',
};

const paymentColors: Record<PaymentStatus, string> = {
  paid: 'bg-successSoft text-success',
  pending: 'bg-warningSoft text-warning',
  overdue: 'bg-dangerSoft text-danger',
  partial: 'bg-actionSoft text-action',
};

const repairColors: Record<RepairStatus, string> = {
  open: 'bg-dangerSoft text-danger',
  in_progress: 'bg-warningSoft text-warning',
  resolved: 'bg-successSoft text-success',
  closed: 'bg-fill text-muted',
};

const proofColors: Record<ProofStatus, string> = {
  pending: 'bg-warningSoft text-warning',
  approved: 'bg-successSoft text-success',
  rejected: 'bg-dangerSoft text-danger',
  dispute: 'bg-actionSoft text-action',
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
    <View className={`rounded-full px-2.5 py-1 self-start ${colorClass.split(' ')[0]}`}>
      <Text className={`text-[11px] font-semibold ${colorClass.split(' ')[1]}`}>{label}</Text>
    </View>
  );
};
