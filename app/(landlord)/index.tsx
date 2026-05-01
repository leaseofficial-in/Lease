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
import { Card } from '../../components/ui/Card';
import { Cap, Chip, CollectionRing, DisplayText, InkCard, Sparkline } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
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

  const activeRentals = rentals?.filter((r) => r.status === 'active') ?? [];
  const actionableRentals = rentals?.filter((r) => r.status !== 'active' || !r.agreement_signed_at) ?? [];
  const totalExpected = rentals?.reduce((sum, r) => sum + Number(r.monthly_rent), 0) ?? 0;
  const collected = activeRentals.reduce((sum, r) => sum + Number(r.monthly_rent), 0);
  const collectionRate = totalExpected > 0 ? Math.round((collected / totalExpected) * 100) : 0;
  const firstName = profile?.full_name?.split(' ')[0] || 'Landlord';
  const queueCount = actionableRentals.length;
  const firstAction = actionableRentals[0];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']} style={{ flex: 1, backgroundColor: Colors.surface }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Avatar name={profile?.full_name ?? 'L'} uri={profile?.avatar_url} size={48} />
            <View className="ml-3">
              <Cap>Portfolio</Cap>
              <Text className="text-xl text-primary" style={{ fontFamily: Fonts.sansSemiBold }}>
                {firstName}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(landlord)/create-rental')}
            className="w-11 h-11 rounded-full bg-primary items-center justify-center"
          >
            <Text className="text-white text-xl">+</Text>
          </TouchableOpacity>
        </View>

        <View className="px-5 pt-4 gap-4">
          <InkCard>
            <View className="flex-row justify-between items-center">
              <Cap style={{ color: 'rgba(255,255,255,0.55)' }}>This month</Cap>
              <Cap style={{ color: 'rgba(255,255,255,0.55)' }}>Collection</Cap>
            </View>
            <View className="flex-row items-center mt-4">
              <CollectionRing value={collectionRate} label={`${collectionRate}%`} sublabel="Collected" inverse />
              <View className="ml-5 flex-1">
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.mono, fontSize: 10 }}>
                  EXPECTED
                </Text>
                <DisplayText style={{ color: Colors.surface, fontSize: 38, lineHeight: 40 }}>
                  {formatCurrency(totalExpected, true)}
                </DisplayText>
                <View className="flex-row gap-5 mt-3">
                  <MoneyStat label="Paid" value={formatCurrency(collected, true)} />
                  <MoneyStat label="Pending" value={formatCurrency(Math.max(totalExpected - collected, 0), true)} warn />
                </View>
              </View>
            </View>
          </InkCard>

          <TouchableOpacity
            activeOpacity={queueCount ? 0.78 : 1}
            onPress={() => {
              if (firstAction?.property_id) {
                router.push(`/(landlord)/property/${firstAction.property_id}`);
              }
            }}
          >
            <Card padded className="border-warning" style={{ borderWidth: queueCount ? 1.5 : 1 }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-9 h-9 rounded-full bg-warning items-center justify-center mr-3">
                    <Text className="text-white font-bold">!</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base text-primary" style={{ fontFamily: Fonts.sansSemiBold }}>
                      {queueCount ? `${queueCount} actions for you` : 'Everything is current'}
                    </Text>
                    <Text className="text-xs text-muted mt-0.5">
                      {queueCount ? 'Review invites, proof, and pending rentals.' : 'No landlord tasks need attention.'}
                    </Text>
                  </View>
                </View>
                <Text className="text-xl text-muted">&gt;</Text>
              </View>
            </Card>
          </TouchableOpacity>

          <View className="flex-row gap-3">
            <MiniPanel label="Properties" value={String(rentals?.length ?? 0)}>
              <View className="flex-row gap-2 mt-2">
                <Chip tone="good">{activeRentals.length} active</Chip>
              </View>
            </MiniPanel>
            <MiniPanel label="YTD income" value={formatCurrency(collected * 4, true)}>
              <Sparkline points={[28, 30, 32, 31, 35, 38]} height={32} />
            </MiniPanel>
          </View>

          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-3">
              <Cap>Your rentals</Cap>
              <TouchableOpacity onPress={() => router.push('/(landlord)/create-rental')}>
                <Cap style={{ color: Colors.primary }}>+ Add</Cap>
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
                subtitle="Create your first rental and invite a tenant."
                actionLabel="Create Rental"
                onAction={() => router.push('/(landlord)/create-rental')}
                icon={<Text style={{ fontSize: 42 }}>+</Text>}
              />
            ) : (
              rentals?.map((rental) => (
                <RentalCard key={rental.id} rental={rental} role="landlord" />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MoneyStat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <View>
      <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>{value}</Text>
      <Cap style={{ color: warn ? '#FFC56B' : 'rgba(255,255,255,0.5)' }}>{label}</Cap>
    </View>
  );
}

function MiniPanel({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <Card className="flex-1" style={{ minHeight: 126 }}>
      <Cap>{label}</Cap>
      <DisplayText style={{ fontSize: 34, lineHeight: 38, marginTop: 6 }}>{value}</DisplayText>
      {children}
    </Card>
  );
}
