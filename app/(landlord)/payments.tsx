import React, { useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { RentPayment, Rental } from '../../types';
import { formatCurrency, formatMonth, formatDate } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { PaymentRowSkeleton } from '../../components/ui/SkeletonLoader';
import { Colors, Fonts } from '../../constants/theme';
import { Cap } from '../../components/ui/V2';
import { markLandlordActionsViewed } from '../../lib/landlordActionViews';
import { markNotificationsRead } from '../../lib/notificationActions';

interface PaymentWithRental extends RentPayment {
  rental: Rental & { property: { name: string; city: string } };
}

export default function LandlordPaymentsScreen() {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();

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
    ?.filter((p) => p.status === 'pending' || p.status === 'overdue' || p.status === 'pending_verification')
    .reduce((sum, p) => sum + p.amount, 0) ?? 0;

  useEffect(() => {
    const paidIds = payments?.filter((payment) => payment.status === 'paid').map((payment) => payment.id) ?? [];
    if (!profile?.id || !paidIds.length) return;

    markLandlordActionsViewed(profile.id, 'payments', paidIds).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-viewed-actions', profile.id, 'payments'] });
    });
  }, [payments, profile?.id, queryClient]);

  useEffect(() => {
    if (!profile?.id) return;

    supabase
      .from('notifications')
      .select('id')
      .eq('user_id', profile.id)
      .eq('read', false)
      .eq('type', 'payment_received')
      .then(({ data }) => {
        const ids = data?.map((item) => item.id) ?? [];
        if (!ids.length) return;
        markNotificationsRead(ids).then(() => {
          void queryClient.invalidateQueries({ queryKey: ['landlord-unread-notifications', profile.id] });
          void queryClient.invalidateQueries({ queryKey: ['landlord-notifications', profile.id] });
        });
      });
  }, [profile?.id, queryClient]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Cap>Payments</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, marginTop: 4 }}>
            Collections
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1, backgroundColor: Colors.success }} elevated>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.sans, fontSize: 12, marginBottom: 4 }}>Received</Text>
            <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 20 }}>
              {formatCurrency(totalReceived, true)}
            </Text>
          </Card>
          <Card style={{ flex: 1, backgroundColor: Colors.warning }} elevated>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.sans, fontSize: 12, marginBottom: 4 }}>Pending</Text>
            <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 20 }}>
              {formatCurrency(totalPending, true)}
            </Text>
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <Cap style={{ marginBottom: 12 }}>All Transactions</Cap>
          <Card padded={false}>
            {isLoading ? (
              <View style={{ paddingHorizontal: 16 }}>
                <PaymentRowSkeleton />
                <PaymentRowSkeleton />
                <PaymentRowSkeleton />
              </View>
            ) : payments?.length === 0 ? (
              <View style={{ paddingHorizontal: 16, paddingVertical: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>💰</Text>
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 14 }}>No payments yet</Text>
              </View>
            ) : (
              payments?.map((payment, i) => (
                <View
                  key={payment.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: i < (payments?.length ?? 0) - 1 ? 1 : 0,
                    borderBottomColor: Colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 14 }} numberOfLines={1}>
                      {payment.rental?.property?.name ?? 'Property'}
                    </Text>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 }}>
                      {formatMonth(payment.month)} · {payment.rental?.property?.city}
                    </Text>
                    {payment.paid_at && (
                      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
                        Paid {formatDate(payment.paid_at)}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
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
