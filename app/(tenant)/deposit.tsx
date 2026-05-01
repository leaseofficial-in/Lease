import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { DepositTransaction, Rental } from '../../types';
import { DepositCard } from '../../components/rental/DepositCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

export default function TenantDepositScreen() {
  const { profile } = useAuthStore();

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
    enabled: !!profile?.id,
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
    enabled: !!rental?.id,
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-5 pt-4 pb-6">
          <Text className="text-2xl font-bold text-primary mb-1">Security Deposit</Text>
          <Text className="text-sm text-muted mb-4">
            Track your deposit and any deductions made by your landlord.
          </Text>

          {!rental ? (
            <EmptyState
              title="No rental found"
              subtitle="Join a rental to see your deposit details."
              icon={<Text style={{ fontSize: 48 }}>💰</Text>}
            />
          ) : (
            <DepositCard
              totalDeposit={rental.security_deposit}
              transactions={transactions ?? []}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
