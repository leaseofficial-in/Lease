import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { DepositTransaction, Rental } from '../../types';
import { DepositCard } from '../../components/rental/DepositCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Cap } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { formatCurrency } from '../../lib/formatters';
import { isDevAuthUserId } from '../../lib/devAuth';

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

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 32 }}
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
              {/* Hero balance card */}
              <Card style={{ backgroundColor: Colors.primary }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.sansMedium, fontSize: 12, marginBottom: 4 }}>
                  Balance Held
                </Text>
                <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 38, lineHeight: 42 }}>
                  {formatCurrency(balance, true)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }}>
                  <View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.sansMedium, fontSize: 10 }}>HELD</Text>
                    <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 15, marginTop: 2 }}>
                      {formatCurrency(rental.security_deposit, true)}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.sansMedium, fontSize: 10 }}>DEDUCTED</Text>
                    <Text style={{ color: totalDeducted > 0 ? '#FF8A7A' : 'rgba(255,255,255,0.4)', fontFamily: Fonts.sansSemiBold, fontSize: 15, marginTop: 2 }}>
                      {formatCurrency(totalDeducted, true)}
                    </Text>
                  </View>
                  {totalRefunded > 0 && (
                    <View>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.sansMedium, fontSize: 10 }}>REFUNDED</Text>
                      <Text style={{ color: '#7AEFC0', fontFamily: Fonts.sansSemiBold, fontSize: 15, marginTop: 2 }}>
                        {formatCurrency(totalRefunded, true)}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>

              <DepositCard
                totalDeposit={rental.security_deposit}
                transactions={transactions ?? []}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
