import React from 'react';
import { View, Text } from 'react-native';
import { RentPayment } from '../../types';
import { formatCurrency, formatMonth, paymentStatusLabel } from '../../lib/formatters';

interface RentStatusBadgeProps {
  payment: RentPayment;
}

const statusConfig = {
  paid:    { bg: 'bg-emerald-50', text: 'text-success', dot: 'bg-success' },
  pending: { bg: 'bg-amber-50',   text: 'text-warning', dot: 'bg-warning' },
  overdue: { bg: 'bg-red-50',     text: 'text-danger',  dot: 'bg-danger'  },
  partial: { bg: 'bg-blue-50',    text: 'text-action',  dot: 'bg-action'  },
};

export const RentStatusBadge: React.FC<RentStatusBadgeProps> = ({ payment }) => {
  const config = statusConfig[payment.status];

  return (
    <View className={`rounded-xl p-3 flex-row items-center ${config.bg}`}>
      <View className={`w-2 h-2 rounded-full ${config.dot} mr-2`} />
      <View className="flex-1">
        <Text className="text-xs text-muted">{formatMonth(payment.month)}</Text>
        <Text className={`text-sm font-semibold ${config.text}`}>
          {paymentStatusLabel[payment.status]}
        </Text>
      </View>
      <Text className={`text-base font-bold ${config.text}`}>
        {formatCurrency(payment.amount)}
      </Text>
    </View>
  );
};
