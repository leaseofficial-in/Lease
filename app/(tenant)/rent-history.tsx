import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { RentPayment } from '../../types';
import { formatCurrency, formatDate, formatMonth } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { PaymentRowSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Cap } from '../../components/ui/V2';
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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1, borderBottomColor: Colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <View>
          <Cap>Tenant</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
            Rent History
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Summary hero */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Card style={{ backgroundColor: Colors.primary }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4, fontFamily: Fonts.sans }}>
              Total Paid
            </Text>
            <Text style={{ color: '#fff', fontSize: 32, fontFamily: Fonts.sansSemiBold, lineHeight: 36 }}>
              {formatCurrency(totalPaid, true)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4, fontFamily: Fonts.sans }}>
              {payments?.filter((p) => p.status === 'paid').length ?? 0} payments made
            </Text>
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}>
          {isLoading ? (
            <Card padded={false}>
              <View style={{ paddingHorizontal: 16 }}>
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
              icon={<Ionicons name="receipt-outline" size={48} color={Colors.muted} />}
            />
          ) : (
            <Card padded={false}>
              {payments.map((payment, i) => (
                <View
                  key={payment.id}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 14,
                    borderBottomWidth: i < payments.length - 1 ? 1 : 0,
                    borderBottomColor: Colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
                      {formatMonth(payment.month)}
                    </Text>
                    <StatusPill kind="payment" value={payment.status} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>
                      {payment.paid_at ? `Paid ${formatDate(payment.paid_at)}` : 'Not paid yet'}
                    </Text>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>
                  {payment.late_fee > 0 && (
                    <Text style={{ color: Colors.danger, fontFamily: Fonts.sans, fontSize: 12, marginTop: 3 }}>
                      Late fee: {formatCurrency(payment.late_fee)}
                    </Text>
                  )}
                  {payment.receipt_url && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(payment.receipt_url!)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}
                    >
                      <Ionicons name="download-outline" size={13} color={Colors.action} />
                      <Text style={{ color: Colors.action, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                        Download Receipt
                      </Text>
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
