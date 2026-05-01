import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Rental } from '../../types';
import { formatCurrency } from '../../lib/formatters';
import { RentalCard } from '../../components/rental/RentalCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { RentalCardSkeleton } from '../../components/ui/SkeletonLoader';
import { Avatar } from '../../components/ui/Avatar';
import { isDevAuthUserId } from '../../lib/devAuth';
import { listLocalRentals } from '../../lib/localRentals';

export default function LandlordDashboard() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: rentals, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['landlord-rentals', profile?.id],
    queryFn: async () => {
      if (isLocalDevUser) {
        return listLocalRentals(profile!.id);
      }

      const { data, error } = await supabase
        .from('rentals')
        .select(`
          *,
          property:properties(*),
          tenant:profiles!rentals_tenant_id_fkey(*)
        `)
        .eq('landlord_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Rental[];
    },
    enabled: !!profile?.id,
  });

  const totalRent = rentals
    ?.filter((r) => r.status === 'active')
    .reduce((sum, r) => sum + r.monthly_rent, 0) ?? 0;

  const activeCount = rentals?.filter((r) => r.status === 'active').length ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-muted">Good morning,</Text>
            <Text className="text-xl font-bold text-primary">
              {profile?.full_name?.split(' ')[0] || 'Landlord'} 👋
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(landlord)/profile')}>
            <Avatar name={profile?.full_name ?? 'L'} uri={profile?.avatar_url} size={42} />
          </TouchableOpacity>
        </View>

        {/* Stats cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 12 }}
        >
          <StatCard
            label="Monthly Income"
            value={formatCurrency(totalRent, true)}
            sub="from active rentals"
            bg="bg-action"
            textColor="text-white"
          />
          <StatCard
            label="Active Rentals"
            value={String(activeCount)}
            sub="properties rented"
            bg="bg-emerald-500"
            textColor="text-white"
          />
          <StatCard
            label="Total Properties"
            value={String(rentals?.length ?? 0)}
            sub="listed on Flatvio"
            bg="bg-white"
            textColor="text-primary"
          />
        </ScrollView>

        {/* Rentals list */}
        <View className="px-5 pb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-primary">Your Properties</Text>
            <TouchableOpacity
              onPress={() => router.push('/(landlord)/create-rental')}
              className="bg-action rounded-full px-4 py-1.5"
            >
              <Text className="text-white text-sm font-semibold">+ Add</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <>
              <RentalCardSkeleton />
              <RentalCardSkeleton />
            </>
          ) : rentals?.length === 0 ? (
            <EmptyState
              title="No rentals yet"
              subtitle="Add your first property and invite a tenant to get started."
              actionLabel="Create Rental"
              onAction={() => router.push('/(landlord)/create-rental')}
              icon={<Text style={{ fontSize: 48 }}>🏠</Text>}
            />
          ) : (
            rentals?.map((rental) => (
              <RentalCard key={rental.id} rental={rental} role="landlord" />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  sub,
  bg,
  textColor,
}: {
  label: string;
  value: string;
  sub: string;
  bg: string;
  textColor: string;
}) {
  return (
    <View
      className={`${bg} rounded-2xl p-4`}
      style={{ width: 160, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
    >
      <Text className={`text-xs ${textColor} opacity-70 mb-1`}>{label}</Text>
      <Text className={`text-2xl font-bold ${textColor}`}>{value}</Text>
      <Text className={`text-xs ${textColor} opacity-60 mt-0.5`}>{sub}</Text>
    </View>
  );
}
