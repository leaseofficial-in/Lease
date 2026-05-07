import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { DepositTransaction, Rental } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Cap } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { isDevAuthUserId } from '../../lib/devAuth';
import { CATEGORY_COLORS, categoryLabel } from '../../components/rental/DepositActionSheet';

const TXN_CONFIG: Record<DepositTransaction['type'], {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bg: string;
  label: string;
  prefix: string;
}> = {
  received: { icon: 'checkmark-circle-outline', color: Colors.success,  bg: Colors.successSoft, label: 'Received',  prefix: '+' },
  deduction: { icon: 'remove-circle-outline',   color: Colors.danger,   bg: Colors.dangerSoft,  label: 'Deduction', prefix: '−' },
  refund:    { icon: 'arrow-undo-circle-outline', color: Colors.action,  bg: Colors.actionSoft,  label: 'Refund',    prefix: '↩' },
};

export default function TenantDepositScreen() {
  const { profile } = useAuthStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: rental } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('tenant_id', profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Rental | null;
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const { data: transactions, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['deposit-transactions', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_transactions')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DepositTransaction[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  if (isLoading) return <LoadingScreen />;

  const totalDeducted  = transactions?.filter((t) => t.type === 'deduction').reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalRefunded  = transactions?.filter((t) => t.type === 'refund').reduce((s, t) => s + t.amount, 0) ?? 0;
  const held           = rental?.security_deposit ?? 0;
  const balance        = held - totalDeducted - totalRefunded;
  const retainedPct    = held > 0 ? Math.max(0, Math.min(100, Math.round((balance / held) * 100))) : 100;
  const isHealthy      = retainedPct >= 80;
  const isSettled      = (transactions?.some((t) => t.type === 'refund')) ?? false;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.action} />}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Cap>Security</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 26, marginTop: 4 }}>
            Deposit
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {!rental ? (
            <EmptyState
              title="No rental found"
              subtitle={
                isLocalDevUser
                  ? 'Local demo mode skips live deposit records.'
                  : 'Join a rental to see your deposit details.'
              }
              icon={<Ionicons name="shield-checkmark-outline" size={48} color={Colors.muted} />}
            />
          ) : (
            <>
              {/* ── Balance hero ── */}
              <View style={{ backgroundColor: Colors.primary, borderRadius: 22, padding: 22, overflow: 'hidden' }}>
                {/* Retained percentage ring hint */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
                      Balance held by landlord
                    </Text>
                    <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 40, lineHeight: 44 }}>
                      {formatCurrency(balance)}
                    </Text>
                  </View>
                  {/* Status chip */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    backgroundColor: isHealthy ? 'rgba(110,235,162,0.18)' : 'rgba(255,107,87,0.18)',
                    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4,
                  }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isHealthy ? '#7AEFC0' : '#FF8A7A' }} />
                    <Text style={{ color: isHealthy ? '#7AEFC0' : '#FF8A7A', fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                      {retainedPct}% intact
                    </Text>
                  </View>
                </View>

                {/* Stat row */}
                <View style={{ flexDirection: 'row', gap: 0, marginBottom: 16 }}>
                  <BalanceStat label="Total Held" value={held} />
                  <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 16 }} />
                  <BalanceStat label="Deducted" value={totalDeducted} danger={totalDeducted > 0} />
                  {totalRefunded > 0 && (
                    <>
                      <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 16 }} />
                      <BalanceStat label="Refunded" value={totalRefunded} success />
                    </>
                  )}
                </View>

                {/* Retention bar */}
                <View>
                  <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3 }}>
                    <View style={{
                      height: 5, borderRadius: 3,
                      backgroundColor: isHealthy ? '#7AEFC0' : '#FF8A7A',
                      width: `${retainedPct}%`,
                    }} />
                  </View>
                </View>
              </View>

              {/* ── Settled banner ── */}
              {isSettled && (
                <View style={{
                  backgroundColor: Colors.successSoft, borderRadius: 18,
                  borderWidth: 1, borderColor: '#A7F3D0',
                  padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center',
                }}>
                  <View style={{
                    width: 38, height: 38, borderRadius: 12,
                    backgroundColor: 'rgba(0,200,150,0.12)', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.success, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginBottom: 2 }}>
                      Deposit Settled
                    </Text>
                    <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                      Your landlord has processed the final refund. Check the activity below for details.
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Rental ended notice ── */}
              {!isSettled && rental.status === 'ended' && balance > 0 && (
                <View style={{
                  backgroundColor: Colors.actionSoft, borderRadius: 18,
                  borderWidth: 1, borderColor: '#C7D7FF',
                  padding: 16, flexDirection: 'row', gap: 12,
                }}>
                  <View style={{
                    width: 38, height: 38, borderRadius: 12,
                    backgroundColor: 'rgba(80,70,228,0.12)', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.action} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginBottom: 3 }}>
                      Rental has ended
                    </Text>
                    <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                      Your landlord should refund {formatCurrency(balance)} after finalising deductions. Follow up if needed.
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Transaction list ── */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Cap>Activity</Cap>
                  {(transactions?.length ?? 0) > 0 && (
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
                      {transactions!.length} transaction{transactions!.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>

                {!transactions?.length ? (
                  <View style={{
                    backgroundColor: Colors.surface, borderRadius: 18,
                    borderWidth: 1, borderColor: Colors.border,
                    padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center',
                  }}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={Colors.muted} />
                    <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, flex: 1 }}>
                      No deposit activity yet. Any deductions or refunds recorded by your landlord will appear here.
                    </Text>
                  </View>
                ) : (
                  <Card padded={false}>
                    {transactions.map((txn, i) => {
                      const cfg = TXN_CONFIG[txn.type];
                      return (
                        <View
                          key={txn.id}
                          style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 16, paddingVertical: 14,
                            borderBottomWidth: i < transactions.length - 1 ? 1 : 0,
                            borderBottomColor: Colors.border,
                          }}
                        >
                          {/* Icon */}
                          <View style={{
                            width: 40, height: 40, borderRadius: 13,
                            backgroundColor: cfg.bg,
                            alignItems: 'center', justifyContent: 'center', marginRight: 13, flexShrink: 0,
                          }}>
                            <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                          </View>

                          {/* Details */}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: cfg.bg }}>
                                <Text style={{ color: cfg.color, fontFamily: Fonts.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                  {cfg.label}
                                </Text>
                              </View>
                              {txn.type === 'deduction' && txn.category && (() => {
                                const cc = CATEGORY_COLORS[txn.category];
                                return (
                                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: cc.bg }}>
                                    <Text style={{ color: cc.text, fontFamily: Fonts.sansSemiBold, fontSize: 10 }}>
                                      {categoryLabel(txn.category)}
                                    </Text>
                                  </View>
                                );
                              })()}
                            </View>
                            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 14 }} numberOfLines={1}>
                              {txn.note}
                            </Text>
                            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 1 }}>
                              {formatDate(txn.created_at)}
                              {txn.payment_method ? ` · ${txn.payment_method === 'upi' ? 'UPI' : txn.payment_method === 'bank_transfer' ? 'Bank' : 'Cash'}` : ''}
                              {txn.reference ? ` · ${txn.reference}` : ''}
                            </Text>
                          </View>

                          {/* Amount */}
                          <Text style={{ color: cfg.color, fontFamily: Fonts.sansSemiBold, fontSize: 15, marginLeft: 12 }}>
                            {cfg.prefix}{formatCurrency(txn.amount, true)}
                          </Text>
                        </View>
                      );
                    })}
                  </Card>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BalanceStat({
  label, value, danger = false, success = false,
}: {
  label: string; value: number; danger?: boolean; success?: boolean;
}) {
  const color = danger ? '#FF8A7A' : success ? '#7AEFC0' : 'rgba(255,255,255,0.55)';
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 }}>
        {label}
      </Text>
      <Text style={{ color, fontFamily: Fonts.sansSemiBold, fontSize: 14 }} numberOfLines={1}>
        {formatCurrency(value, true)}
      </Text>
    </View>
  );
}
