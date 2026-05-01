import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { RentPayment } from '../../types';
import { formatCurrency, formatDate, formatMonth } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { PaymentRowSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Colors, Fonts } from '../../constants/theme';
import { isDevAuthUserId } from '../../lib/devAuth';

export default function RentHistoryScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: payments, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tenant-payments', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('tenant_id', profile!.id)
        .order('month', { ascending: false });
      if (error) throw error;
      return data as RentPayment[];
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const totalPaid = payments
    ?.filter((p) => p.status === 'paid')
    .reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View className="px-5 py-4 flex-row items-center bg-white border-b border-border">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <Text className="text-primary">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-primary">Rent History</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Summary */}
        <View className="px-5 pt-4 pb-2">
          <Card style={{ backgroundColor: Colors.action }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4, fontFamily: Fonts.sans }}>Total Paid</Text>
            <Text style={{ color: '#fff', fontSize: 28, fontFamily: Fonts.sansSemiBold }}>{formatCurrency(totalPaid, true)}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2, fontFamily: Fonts.sans }}>{payments?.filter(p => p.status === 'paid').length ?? 0} payments made</Text>
          </Card>
        </View>

        <View className="px-5 pb-8 pt-2">
          {isLoading ? (
            <Card padded={false}>
              <View className="px-4">
                <PaymentRowSkeleton />
                <PaymentRowSkeleton />
              </View>
            </Card>
          ) : !payments?.length ? (
            <EmptyState
              title="No payments yet"
              subtitle={
                isLocalDevUser
                  ? 'Local demo mode skips live payment records.'
                  : 'Your rent payment history will appear here.'
              }
              icon={<Text style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 32 }}>R</Text>}
            />
          ) : (
            <Card padded={false}>
              {payments?.map((payment, i) => (
                <View
                  key={payment.id}
                  className={`px-4 py-3.5 ${i < (payments.length - 1) ? 'border-b border-border' : ''}`}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-semibold text-primary">
                      {formatMonth(payment.month)}
                    </Text>
                    <StatusPill kind="payment" value={payment.status} />
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm text-muted">
                      {payment.paid_at ? `Paid ${formatDate(payment.paid_at)}` : 'Not paid yet'}
                    </Text>
                    <Text className="text-base font-bold text-primary">
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>
                  {payment.late_fee > 0 && (
                    <Text className="text-xs text-danger mt-0.5">
                      Late fee: {formatCurrency(payment.late_fee)}
                    </Text>
                  )}
                  {payment.receipt_url && (
                    <TouchableOpacity onPress={() => Linking.openURL(payment.receipt_url!)}>
                      <Text className="text-xs text-action mt-1">Download Receipt →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
