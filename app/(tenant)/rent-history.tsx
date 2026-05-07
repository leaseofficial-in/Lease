import React, { useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
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
import { AppIcon, BackButton } from '../../components/ui/Icon';
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

  const totalPaid = payments?.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0) ?? 0;
  const paidCount = payments?.filter((p) => p.status === 'paid').length ?? 0;
  const onTimeCount = payments?.filter((p) => p.status === 'paid' && (p.late_fee ?? 0) === 0).length ?? 0;
  const onTimePct = paidCount > 0 ? Math.round((onTimeCount / paidCount) * 100) : null;

  // Group by year, descending
  const paymentsByYear = useMemo(() => {
    if (!payments?.length) return [];
    const map = new Map<number, RentPayment[]>();
    for (const p of payments) {
      const yr = new Date(p.month).getFullYear();
      const list = map.get(yr) ?? [];
      list.push(p);
      map.set(yr, list);
    }
    return [...map.entries()].sort(([a], [b]) => b - a);
  }, [payments]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
      }}>
        <BackButton onPress={() => router.back()} style={{ marginRight: 12 }} />
        <View>
          <Cap>Tenant</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
            Rent History
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.action} />}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Summary stats ── */}
        {(isLoading || (payments && payments.length > 0)) && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 10 }}>
            {/* Total paid hero */}
            <View style={{
              backgroundColor: Colors.primary, borderRadius: 20, padding: 20,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                  Total Paid
                </Text>
                <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 34, lineHeight: 38 }}>
                  {isLoading ? '—' : formatCurrency(totalPaid, true)}
                </Text>
                {!isLoading && paidCount > 0 && (
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 }}>
                    {paidCount} payment{paidCount !== 1 ? 's' : ''} confirmed
                  </Text>
                )}
              </View>
              {onTimePct !== null && (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <View style={{
                    width: 56, height: 56, borderRadius: 28,
                    borderWidth: 3,
                    borderColor: onTimePct >= 80 ? Colors.success : Colors.warning,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{
                      color: onTimePct >= 80 ? '#7AEFC0' : '#F6C47F',
                      fontFamily: Fonts.sansBold, fontSize: 15,
                    }}>
                      {onTimePct}%
                    </Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: Fonts.sans, fontSize: 10 }}>
                    on time
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Payment list ── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, paddingTop: 4 }}>
          {isLoading ? (
            <Card padded={false}>
              <View style={{ paddingHorizontal: 16 }}>
                <PaymentRowSkeleton />
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
                  : 'Your rent payment history will appear here once you start paying.'
              }
              icon={<AppIcon name="receipt-outline" size={48} color={Colors.muted} />}
            />
          ) : (
            <View style={{ gap: 24 }}>
              {paymentsByYear.map(([year, yearPayments]) => (
                <View key={year}>
                  {/* Year header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Text style={{
                      color: Colors.ink2, fontFamily: Fonts.sansSemiBold, fontSize: 14,
                    }}>
                      {year}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
                      {yearPayments.length} months
                    </Text>
                  </View>

                  {/* Payment rows */}
                  <Card padded={false}>
                    {yearPayments.map((payment, index) => (
                      <PaymentRow
                        key={payment.id}
                        payment={payment}
                        isLast={index === yearPayments.length - 1}
                        onReceipt={() => router.push({ pathname: '/receipt/[paymentId]', params: { paymentId: payment.id } })}
                      />
                    ))}
                  </Card>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PaymentRow({
  payment,
  isLast,
  onReceipt,
}: {
  payment: RentPayment;
  isLast: boolean;
  onReceipt: () => void;
}) {
  const isOverdue = payment.status === 'overdue';
  const isPending = payment.status === 'pending_verification';
  const isPaid = payment.status === 'paid';
  const hasLateFee = (payment.late_fee ?? 0) > 0;

  return (
    <View style={{
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: Colors.border,
      backgroundColor: isOverdue ? Colors.dangerSoft : Colors.surface,
    }}>
      {/* Main row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {/* Left: month + paid date */}
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginBottom: 2 }}>
            {formatMonth(payment.month)}
          </Text>
          {payment.paid_at && isPaid && (
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
              Paid {formatDate(payment.paid_at)}
            </Text>
          )}
          {isPending && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={12} color={Colors.muted} />
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
                Awaiting landlord confirmation
              </Text>
            </View>
          )}
          {!payment.paid_at && !isPending && (
            <Text style={{ color: isOverdue ? Colors.danger : Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
              {isOverdue ? 'Payment overdue' : 'Not paid yet'}
            </Text>
          )}
        </View>

        {/* Right: amount + status */}
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
            {formatCurrency(payment.amount)}
          </Text>
          <StatusPill kind="payment" value={payment.status} />
        </View>
      </View>

      {/* Secondary row: late fee + receipt */}
      {(hasLateFee || isPaid) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          {hasLateFee ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="alert-circle" size={13} color={Colors.danger} />
              <Text style={{ color: Colors.danger, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                Late fee: {formatCurrency(payment.late_fee)}
              </Text>
            </View>
          ) : <View />}

          {isPaid && (
            <TouchableOpacity
              onPress={onReceipt}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
                backgroundColor: Colors.actionSoft, borderWidth: 1, borderColor: '#C7D7FF',
              }}
            >
              <AppIcon name="document-text-outline" size={13} color={Colors.action} />
              <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>
                HRA Receipt
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
