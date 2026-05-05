import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { RentPayment, Rental } from '../../types';
import { formatCurrency, formatMonth, formatDate } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { PaymentRowSkeleton } from '../../components/ui/SkeletonLoader';
import { Colors, Fonts } from '../../constants/theme';
import { Cap } from '../../components/ui/V2';
import { markLandlordActionsViewed } from '../../lib/landlordActionViews';
import { markNotificationsRead } from '../../lib/notificationActions';
import { notifyUser } from '../../lib/sendPush';
import { EmptyState } from '../../components/ui/EmptyState';

interface PaymentWithRental extends RentPayment {
  rental: Rental & { property: { name: string; city: string } };
}

type Filter = 'all' | 'pending_verification' | 'paid';

export default function LandlordPaymentsScreen() {
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmingPayment, setConfirmingPayment] = useState<PaymentWithRental | null>(null);
  const [confirming, setConfirming] = useState(false);

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
        .limit(100);
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

  const toConfirmPayments = payments?.filter((p) => p.status === 'pending_verification') ?? [];

  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];
    if (filter === 'pending_verification') return toConfirmPayments;
    if (filter === 'paid') return payments.filter((p) => p.status === 'paid');
    // 'all': pending_verification first, then the rest sorted by month desc
    const confirm = payments.filter((p) => p.status === 'pending_verification');
    const rest = payments.filter((p) => p.status !== 'pending_verification');
    return [...confirm, ...rest];
  }, [payments, filter, toConfirmPayments]);

  const handleConfirm = async () => {
    if (!confirmingPayment) return;
    setConfirming(true);
    try {
      const { error } = await supabase
        .from('rent_payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', confirmingPayment.id);
      if (error) throw error;

      if (confirmingPayment.rental.tenant_id) {
        void notifyUser({
          recipientId: confirmingPayment.rental.tenant_id,
          title: 'Rent confirmed',
          body: `Your landlord confirmed receipt of ${formatCurrency(confirmingPayment.amount)} for ${formatMonth(confirmingPayment.month)}.`,
          type: 'payment_confirmed' as never,
          data: { rental_id: confirmingPayment.rental_id },
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['landlord-payments'] });
      await queryClient.invalidateQueries({ queryKey: ['landlord-payment-actions'] });
      setConfirmingPayment(null);
      showToast('Payment confirmed', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to confirm payment', 'error');
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    const paidIds = payments?.filter((p) => p.status === 'paid').map((p) => p.id) ?? [];
    if (!profile?.id || !paidIds.length) return;
    markLandlordActionsViewed(profile.id, 'payments', paidIds).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-viewed-actions', profile.id, 'payments'] });
    });
  }, [payments, profile?.id, queryClient]);

  // Mark pending payments overdue client-side when due date has passed (replaces pg_cron)
  useEffect(() => {
    if (!payments?.length) return;
    const today = new Date();
    const overdueIds = payments
      .filter((p) => {
        if (p.status !== 'pending') return false;
        const monthDate = new Date(p.month);
        const due = new Date(monthDate.getFullYear(), monthDate.getMonth(), p.rental.rent_due_day);
        return due < today;
      })
      .map((p) => p.id);
    if (!overdueIds.length) return;
    void supabase
      .from('rent_payments')
      .update({ status: 'overdue' })
      .in('id', overdueIds)
      .then(() => queryClient.invalidateQueries({ queryKey: ['landlord-payments'] }));
  }, [payments, queryClient]);

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
        });
      });
  }, [profile?.id, queryClient]);

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending_verification', label: 'To Confirm', count: toConfirmPayments.length },
    { key: 'paid', label: 'Received' },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Cap>Landlord</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, marginTop: 4 }}>
            Collections
          </Text>
        </View>

        {/* Summary stats */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1, backgroundColor: Colors.success }} elevated>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.sans, fontSize: 12, marginBottom: 4 }}>
              Received
            </Text>
            <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 20 }}>
              {formatCurrency(totalReceived, true)}
            </Text>
          </Card>
          <Card style={{ flex: 1, backgroundColor: Colors.warning }} elevated>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.sans, fontSize: 12, marginBottom: 4 }}>
              Pending
            </Text>
            <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 20 }}>
              {formatCurrency(totalPending, true)}
            </Text>
          </Card>
        </View>

        {/* Confirm banner */}
        {toConfirmPayments.length > 0 && filter === 'all' && (
          <TouchableOpacity
            onPress={() => setFilter('pending_verification')}
            activeOpacity={0.85}
            style={{
              marginHorizontal: 20,
              marginBottom: 16,
              backgroundColor: Colors.warningSoft,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: '#F1D39B',
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: Colors.warning, alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="time" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
                {toConfirmPayments.length} payment{toConfirmPayments.length === 1 ? '' : 's'} waiting for your confirmation
              </Text>
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 }}>
                Tap to confirm receipt and mark as paid
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.warning} />
          </TouchableOpacity>
        )}

        {/* Filter chips */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((f) => {
              const isSelected = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7,
                    borderRadius: 20, borderWidth: 1.5,
                    borderColor: isSelected ? Colors.primary : Colors.border,
                    backgroundColor: isSelected ? Colors.primary : Colors.surface,
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                  }}
                >
                  <Text style={{
                    color: isSelected ? Colors.surface : Colors.primary,
                    fontFamily: Fonts.sansSemiBold, fontSize: 13,
                  }}>
                    {f.label}
                  </Text>
                  {(f.count ?? 0) > 0 && (
                    <View style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : Colors.warningSoft,
                      borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
                    }}>
                      <Text style={{
                        color: isSelected ? Colors.surface : Colors.warning,
                        fontFamily: Fonts.sansBold, fontSize: 11,
                      }}>
                        {f.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Payment list */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <Card padded={false}>
            {isLoading ? (
              <View style={{ paddingHorizontal: 16 }}>
                <PaymentRowSkeleton />
                <PaymentRowSkeleton />
                <PaymentRowSkeleton />
              </View>
            ) : filteredPayments.length === 0 ? (
              <EmptyState
                title={filter === 'pending_verification' ? 'No payments to confirm' : 'No payments yet'}
                subtitle={
                  filter === 'pending_verification'
                    ? 'When tenants submit a UPI or cash payment, they will appear here.'
                    : 'Payments will appear here once tenants start paying.'
                }
                icon={<Ionicons name="receipt-outline" size={42} color={Colors.muted} />}
              />
            ) : (
              filteredPayments.map((payment, i) => {
                const isPendingVerification = payment.status === 'pending_verification';
                return (
                  <TouchableOpacity
                    key={payment.id}
                    onPress={isPendingVerification ? () => setConfirmingPayment(payment) : undefined}
                    activeOpacity={isPendingVerification ? 0.78 : 1}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 16, paddingVertical: 14,
                      borderBottomWidth: i < filteredPayments.length - 1 ? 1 : 0,
                      borderBottomColor: Colors.border,
                      backgroundColor: isPendingVerification ? Colors.warningSoft : Colors.surface,
                    }}
                  >
                    {isPendingVerification && (
                      <View style={{
                        width: 6, height: 6, borderRadius: 3,
                        backgroundColor: Colors.warning, marginRight: 10,
                      }} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 14 }}
                        numberOfLines={1}
                      >
                        {payment.rental?.property?.name ?? 'Property'}
                      </Text>
                      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 }}>
                        {formatMonth(payment.month)} · {payment.rental?.property?.city}
                      </Text>
                      {isPendingVerification && payment.payment_method && (
                        <Text style={{ color: Colors.warning, fontFamily: Fonts.sansMedium, fontSize: 12, marginTop: 2 }}>
                          {payment.payment_method === 'upi' ? 'UPI' : 'Cash'}
                          {payment.utr_number ? ` · UTR: ${payment.utr_number}` : ''}
                        </Text>
                      )}
                      {payment.paid_at && payment.status === 'paid' && (
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
                    {isPendingVerification && (
                      <Ionicons name="chevron-forward" size={16} color={Colors.warning} style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Confirm payment bottom sheet */}
      <BottomSheet
        visible={!!confirmingPayment}
        onClose={() => { if (!confirming) setConfirmingPayment(null); }}
        scrollable
      >
        {confirmingPayment && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: Colors.warningSoft, alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="cash-outline" size={22} color={Colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>
                  Confirm payment?
                </Text>
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>
                  {confirmingPayment.rental?.property?.name}
                </Text>
              </View>
            </View>

            <View style={{ backgroundColor: Colors.fill, borderRadius: 14, padding: 16, gap: 10, marginBottom: 20 }}>
              <ConfirmRow label="Month" value={formatMonth(confirmingPayment.month)} />
              <ConfirmRow label="Amount" value={formatCurrency(confirmingPayment.amount)} highlight />
              <ConfirmRow label="Method" value={confirmingPayment.payment_method === 'upi' ? 'UPI' : confirmingPayment.payment_method === 'cash' ? 'Cash' : '—'} />
              {confirmingPayment.utr_number && (
                <ConfirmRow label="UTR" value={confirmingPayment.utr_number} mono />
              )}
              {confirmingPayment.payment_note && (
                <ConfirmRow label="Note" value={confirmingPayment.payment_note} />
              )}
            </View>

            <Button
              title="Mark as Received"
              onPress={handleConfirm}
              loading={confirming}
              fullWidth
              size="lg"
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setConfirmingPayment(null)}
              disabled={confirming}
              fullWidth
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

function ConfirmRow({
  label,
  value,
  highlight = false,
  mono = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>{label}</Text>
      <Text style={{
        color: highlight ? Colors.primary : Colors.ink2,
        fontFamily: mono ? Fonts.mono : highlight ? Fonts.sansSemiBold : Fonts.sansMedium,
        fontSize: highlight ? 16 : 13,
      }}>
        {value}
      </Text>
    </View>
  );
}
