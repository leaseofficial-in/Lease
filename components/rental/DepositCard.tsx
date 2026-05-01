import React from 'react';
import { View, Text } from 'react-native';
import { DepositTransaction } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { Card } from '../ui/Card';

interface DepositSummaryProps {
  totalDeposit: number;
  transactions: DepositTransaction[];
}

export const DepositCard: React.FC<DepositSummaryProps> = ({
  totalDeposit,
  transactions,
}) => {
  const totalDeducted = transactions
    .filter((t) => t.type === 'deduction')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalRefunded = transactions
    .filter((t) => t.type === 'refund')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalDeposit - totalDeducted - totalRefunded;

  return (
    <Card className="mb-4">
      <Text className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
        Deposit Summary
      </Text>
      <View className="flex-row justify-between mb-4">
        <DepositStat label="Total Held" value={totalDeposit} color="text-primary" />
        <DepositStat label="Deducted" value={totalDeducted} color="text-danger" />
        <DepositStat label="Balance" value={balance} color="text-success" />
      </View>

      {transactions.length > 0 && (
        <>
          <View className="h-px bg-border mb-3" />
          {transactions.map((txn) => (
            <DepositRow key={txn.id} txn={txn} />
          ))}
        </>
      )}
    </Card>
  );
};

const DepositStat: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <View className="items-center">
    <Text className="text-xs text-muted mb-0.5">{label}</Text>
    <Text className={`text-base font-bold ${color}`}>{formatCurrency(value, true)}</Text>
  </View>
);

const DepositRow: React.FC<{ txn: DepositTransaction }> = ({ txn }) => {
  const isDeduction = txn.type === 'deduction';
  const isRefund = txn.type === 'refund';
  const amountColor = isDeduction ? 'text-danger' : isRefund ? 'text-muted' : 'text-success';
  const prefix = isDeduction ? '-' : isRefund ? '↩' : '+';

  return (
    <View className="flex-row items-center py-2 border-b border-border last:border-0">
      <View className="flex-1">
        <Text className="text-sm text-primary">{txn.note || txn.type}</Text>
        <Text className="text-xs text-muted">{formatDate(txn.created_at)}</Text>
      </View>
      <Text className={`text-sm font-semibold ${amountColor}`}>
        {prefix}{formatCurrency(txn.amount)}
      </Text>
    </View>
  );
};
