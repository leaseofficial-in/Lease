import React from 'react';
import { View, Text } from 'react-native';
import { DepositTransaction } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { Card } from '../ui/Card';
import { Cap } from '../ui/V2';
import { Colors, Fonts } from '../../constants/theme';

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
      <Cap style={{ marginBottom: 12 }}>Deposit Summary</Cap>
      <View className="flex-row justify-between mb-4">
        <DepositStat label="Total Held" value={totalDeposit} color={Colors.primary} />
        <DepositStat label="Deducted" value={totalDeducted} color={Colors.danger} />
        <DepositStat label="Balance" value={balance} color={Colors.success} />
      </View>

      {transactions.length > 0 ? (
        <>
          <View className="h-px bg-border mb-3" />
          {transactions.map((txn) => (
            <DepositRow key={txn.id} txn={txn} />
          ))}
        </>
      ) : (
        <View className="rounded-2xl bg-fill p-4">
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
            No deposit activity has been recorded yet.
          </Text>
        </View>
      )}
    </Card>
  );
};

const DepositStat: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <View className="items-center" style={{ flex: 1 }}>
    <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11, marginBottom: 2 }}>
      {label}
    </Text>
    <Text style={{ color, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
      {formatCurrency(value, true)}
    </Text>
  </View>
);

const DepositRow: React.FC<{ txn: DepositTransaction }> = ({ txn }) => {
  const isDeduction = txn.type === 'deduction';
  const isRefund = txn.type === 'refund';
  const amountColor = isDeduction ? Colors.danger : isRefund ? Colors.ink3 : Colors.success;
  const prefix = isDeduction ? '-' : isRefund ? 'Refund ' : '+';

  return (
    <View className="flex-row items-center py-2 border-b border-border">
      <View className="flex-1 pr-3">
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
          {txn.note || txn.type}
        </Text>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11, marginTop: 2 }}>
          {formatDate(txn.created_at)}
        </Text>
      </View>
      <Text style={{ color: amountColor, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>
        {prefix}{formatCurrency(txn.amount)}
      </Text>
    </View>
  );
};
