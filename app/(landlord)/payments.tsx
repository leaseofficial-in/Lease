import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { RentPayment, Rental } from '../../types';
import { formatCurrency, formatMonth, formatDate } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { PaymentRowSkeleton } from '../../components/ui/SkeletonLoader';

interface PaymentWithRental extends RentPayment {
  rental: Rental & { property: { name: string; city: string } };
}

export default function LandlordPaymentsScreen() {
  const { profile } = useAuthStore();

  const { data: payments, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['landlord-payments', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          *,
          rental:rentals!inner(
            *,
            property:properties(name, city)
          )
        `)
        .eq('rental.landlord_id', profile!.id)
        .order('month', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as PaymentWithRental[];
    },
    enabled: !!profile?.id,
  });

  const totalReceived = payments
    ?.filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const totalPending = payments
    ?.filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0) ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-primary">Rent Collections</Text>
        </View>

        {/* Summary */}
        <View className="px-5 pb-4 flex-row gap-3">
          <Card className="flex-1 bg-emerald-500" elevated>
            <Text className="text-xs text-white/70 mb-1">Received</Text>
            <Text className="text-xl font-bold text-white">
              {formatCurrency(totalReceived, true)}
            </Text>
          </Card>
          <Card className="flex-1 bg-amber-400" elevated>
            <Text className="text-xs text-white/70 mb-1">Pending</Text>
            <Text className="text-xl font-bold text-white">
              {formatCurrency(totalPending, true)}
            </Text>
          </Card>
        </View>

        {/* Payment rows */}
        <View className="px-5 pb-8">
          <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            All Transactions
          </Text>
          <Card padded={false}>
            {isLoading ? (
              <View className="px-4">
                <PaymentRowSkeleton />
                <PaymentRowSkeleton />
                <PaymentRowSkeleton />
              </View>
            ) : payments?.length === 0 ? (
              <View className="px-4 py-8 items-center">
                <Text style={{ fontSize: 36 }} className="mb-2">💰</Text>
                <Text className="text-sm text-muted">No payments yet</Text>
              </View>
            ) : (
              payments?.map((payment, i) => (
                <View
                  key={payment.id}
                  className={`flex-row items-center px-4 py-3.5 ${
                    i < (payments?.length ?? 0) - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-primary" numberOfLines={1}>
                      {payment.rental?.property?.name ?? 'Property'}
                    </Text>
                    <Text className="text-xs text-muted">
                      {formatMonth(payment.month)} · {payment.rental?.property?.city}
                    </Text>
                    {payment.paid_at && (
                      <Text className="text-xs text-muted">
                        Paid {formatDate(payment.paid_at)}
                      </Text>
                    )}
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-sm font-bold text-primary">
                      {formatCurrency(payment.amount)}
                    </Text>
                    <StatusPill kind="payment" value={payment.status} />
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
