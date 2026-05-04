import React from 'react';
import { View, Text } from 'react-native';
import { RentalStatus, PaymentStatus, RepairStatus, ProofStatus } from '../../types';
import { rentalStatusLabel, paymentStatusLabel, repairStatusLabel, proofStatusLabel } from '../../lib/formatters';
import { Colors } from '../../constants/theme';
import { Fonts } from '../../constants/theme';

type StatusType =
  | { kind: 'rental'; value: RentalStatus }
  | { kind: 'payment'; value: PaymentStatus }
  | { kind: 'repair'; value: RepairStatus }
  | { kind: 'proof'; value: ProofStatus };

const rentalStyle = {
  active:          { bg: Colors.successSoft, text: Colors.success },
  pending_tenant:  { bg: Colors.warningSoft, text: Colors.warning },
  pending_proof:   { bg: Colors.actionSoft,  text: Colors.action },
  pending_moveout: { bg: '#EDE9FE',          text: '#7C3AED' as string },
  ended:           { bg: Colors.fill,        text: Colors.muted },
} satisfies Record<RentalStatus, { bg: string; text: string }>;

const paymentStyle = {
  paid:                 { bg: Colors.successSoft, text: Colors.success },
  pending:              { bg: Colors.warningSoft, text: Colors.warning },
  overdue:              { bg: Colors.dangerSoft,  text: Colors.danger },
  partial:              { bg: Colors.actionSoft,  text: Colors.action },
  pending_verification: { bg: Colors.actionSoft,  text: Colors.action },
} satisfies Record<PaymentStatus, { bg: string; text: string }>;

const repairStyle = {
  open:        { bg: Colors.dangerSoft,  text: Colors.danger },
  in_progress: { bg: Colors.warningSoft, text: Colors.warning },
  resolved:    { bg: Colors.successSoft, text: Colors.success },
  closed:      { bg: Colors.fill,        text: Colors.muted },
} satisfies Record<RepairStatus, { bg: string; text: string }>;

const proofStyle = {
  pending:  { bg: Colors.warningSoft, text: Colors.warning },
  approved: { bg: Colors.successSoft, text: Colors.success },
  rejected: { bg: Colors.dangerSoft,  text: Colors.danger },
  dispute:  { bg: Colors.actionSoft,  text: Colors.action },
} satisfies Record<ProofStatus, { bg: string; text: string }>;

export const StatusPill: React.FC<StatusType> = (props) => {
  let label = '';
  let colors: { bg: string; text: string } = { bg: Colors.fill, text: Colors.muted };

  if (props.kind === 'rental') {
    label = rentalStatusLabel[props.value];
    colors = rentalStyle[props.value];
  } else if (props.kind === 'payment') {
    label = paymentStatusLabel[props.value];
    colors = paymentStyle[props.value];
  } else if (props.kind === 'repair') {
    label = repairStatusLabel[props.value];
    colors = repairStyle[props.value];
  } else {
    label = proofStatusLabel[props.value];
    colors = proofStyle[props.value];
  }

  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.bg, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontFamily: Fonts.sansSemiBold, color: colors.text }}>{label}</Text>
    </View>
  );
};
