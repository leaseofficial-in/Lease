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

const TXN_CONFIG: Record<DepositTransaction['type'], {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bg: string;
  label: string;
  prefix: string;
}> = {
  deduction: { icon: 'remove-circle-outline', color: Colors.danger, bg: Colors.dangerSoft, label: 'Deduction', prefix: '−' },
  refund: { icon: 'arrow-undo-circle-outline', color: Colors.action, bg: Colors.actionSoft, label: 'Refund', prefix: '↩' },
  received: { icon: 'checkmark-circle-outline', color: Colors.success, bg: Colors.successSoft, label: 'Received', prefix: '+' },
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

  const totalDeducted = transactions?.filter((t) => t.type === 'deduction').reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalRefunded = transactions?.filter((t) => t.type === 'refund').reduce((s, t) => s + t.amount, 0) ?? 0;
  const balance = (rental?.security_deposit ?? 0) - totalDeducted - totalRefunded;
  const occupancyRate = rental?.security_deposit
    ? Math.round((balance / rental.security_deposit) * 100)
    : 100;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Cap>Security</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, marginTop: 4 }}>
            Deposit
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 16 }}>
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
              {/* Hero balance */}
              <Card style={{ backgroundColor: Colors.primary }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
                  Balance held by landlord
                </Text>
                <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 40, lineHeight: 44, marginBottom: 16 }}>
                  {formatCurrency(balance)}
                </Text>

                {/* Breakdown row */}
                <View style={{ flexDirection: 'row', gap: 0 }}>
                  <BalanceStat label="Total Held" value={rental.security_deposit} />
                  <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 }} />
                  <BalanceStat label="Deducted" value={totalDeducted} danger={totalDeducted > 0} />
                  {totalRefunded > 0 && (
                    <>
                      <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 }} />
                      <BalanceStat label="Refunded" value={totalRefunded} success />
                    </>
                  )}
                </View>

                {/* Retention bar */}
                <View style={{ marginTop: 16 }}>
                  <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
                    <View style={{
                      height: 4, borderRadius: 2,
                      backgroundColor: totalDeducted > 0 ? '#FF8A7A' : '#7AEFC0',
                      width: `${Math.max(0, Math.min(100, occupancyRate))}%`,
                    }} />
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: Fonts.sans, fontSize: 11, marginTop: 6 }}>
                    {occupancyRate}% of deposit intact
                  </Text>
                </View>
              </Card>

              {/* Refund info if rental ended */}
              {rental.status === 'ended' && (
                <Card style={{ backgroundColor: Colors.actionSoft, borderColor: '#C7D7FF' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.action} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
                        Rental has ended
                      </Text>
                      <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, marginTop: 3 }}>
                        Your landlord should refund {formatCurrency(balance)} after finalising any deductions. Follow up if you haven't received it.
                      </Text>
                    </View>
                  </View>
                </Card>
              )}

              {/* Transaction list */}
              <View>
                <Cap style={{ marginBottom: 12 }}>Activity ({transactions?.length ?? 0})</Cap>

                {!transactions?.length ? (
                  <Card style={{ backgroundColor: Colors.fill }}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <Ionicons name="shield-checkmark-outline" size={22} color={Colors.muted} />
                      <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, flex: 1 }}>
                        No deposit activity yet. Deductions or refunds your landlord records will appear here.
                      </Text>
                    </View>
                  </Card>
                ) : (
                  <Card padded={false}>
                    {transactions.map((txn, i) => {
                      const cfg = TXN_CONFIG[txn.type];
                      return (
                        <View
                          key={txn.id}
                          style={{
                            flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
                            borderBottomWidth: i < transactions.length - 1 ? 1 : 0,
                            borderBottomColor: Colors.border,
                          }}
                        >
                          <View style={{
                            width: 38, height: 38, borderRadius: 19,
                            backgroundColor: cfg.bg,
                            alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0,
                          }}>
                            <Ionicons name={cfg.icon} size={19} color={cfg.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <Text style={{ color: cfg.color, fontFamily: Fonts.sansSemiBold, fontSize: 11, textTransform: 'uppercase' }}>
                                {cfg.label}
                              </Text>
                            </View>
                            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 14 }}>
                              {txn.note}
                            </Text>
                            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 }}>
                              {formatDate(txn.created_at)}
                            </Text>
                          </View>
                          <Text style={{ color: cfg.color, fontFamily: Fonts.sansSemiBold, fontSize: 15, marginLeft: 10 }}>
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

function BalanceStat({ label, value, danger = false, success = false }: {
  label: string; value: number; danger?: boolean; success?: boolean;
}) {
  const color = danger ? '#FF8A7A' : success ? '#7AEFC0' : 'rgba(255,255,255,0.55)';
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 }}>
        {label}
      </Text>
      <Text style={{ color, fontFamily: Fonts.sansSemiBold, fontSize: 14 }} numberOfLines={1}>
        {formatCurrency(value, true)}
      </Text>
    </View>
  );
}
