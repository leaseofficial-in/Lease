import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { AppNotification, Rental, RentPayment, RepairRequest } from '../../types';
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
import { getViewedLandlordActionIds } from '../../lib/landlordActionViews';

interface LandlordRepairAction extends Pick<RepairRequest, 'id' | 'rental_id' | 'title' | 'priority' | 'status' | 'created_at'> {
  rental?: { id: string; property_id: string; property?: { name: string } | null };
}

interface LandlordPaymentAction extends Pick<RentPayment, 'id' | 'rental_id' | 'amount' | 'status' | 'month' | 'paid_at' | 'created_at'> {
  rental?: { id: string; property_id: string; property?: { name: string } | null };
}

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

  const { data: unreadNotifications, refetch: refetchUnreadNotifications } = useQuery({
    queryKey: ['landlord-unread-notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as AppNotification[];
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const { data: repairActions, refetch: refetchRepairActions } = useQuery({
    queryKey: ['landlord-repair-actions', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_requests')
        .select(`
          id,
          rental_id,
          title,
          priority,
          status,
          created_at,
          rental:rentals!inner(
            id,
            property_id,
            property:properties(name)
          )
        `)
        .eq('rental.landlord_id', profile!.id)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as LandlordRepairAction[];
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const { data: paymentActions, refetch: refetchPaymentActions } = useQuery({
    queryKey: ['landlord-payment-actions', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          id,
          rental_id,
          amount,
          status,
          month,
          paid_at,
          created_at,
          rental:rentals!inner(
            id,
            property_id,
            property:properties(name)
          )
        `)
        .eq('rental.landlord_id', profile!.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as LandlordPaymentAction[];
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const { data: viewedRepairIds = [], refetch: refetchViewedRepairIds } = useQuery({
    queryKey: ['landlord-viewed-actions', profile?.id, 'repairs'],
    queryFn: () => getViewedLandlordActionIds(profile!.id, 'repairs'),
    enabled: !!profile?.id,
  });

  const { data: viewedPaymentIds = [], refetch: refetchViewedPaymentIds } = useQuery({
    queryKey: ['landlord-viewed-actions', profile?.id, 'payments'],
    queryFn: () => getViewedLandlordActionIds(profile!.id, 'payments'),
    enabled: !!profile?.id,
  });

  useFocusEffect(
    React.useCallback(() => {
      void refetchViewedRepairIds();
      void refetchViewedPaymentIds();
      if (!isLocalDevUser) {
        void refetchUnreadNotifications();
        void refetchRepairActions();
        void refetchPaymentActions();
      }
    }, [isLocalDevUser, refetchPaymentActions, refetchRepairActions, refetchUnreadNotifications, refetchViewedPaymentIds, refetchViewedRepairIds]),
  );

  const refreshDashboard = async () => {
    await Promise.all([
      refetch(),
      !isLocalDevUser ? refetchUnreadNotifications() : Promise.resolve(),
      !isLocalDevUser ? refetchRepairActions() : Promise.resolve(),
      !isLocalDevUser ? refetchPaymentActions() : Promise.resolve(),
      refetchViewedRepairIds(),
      refetchViewedPaymentIds(),
    ]);
  };

  const activeRentals = rentals?.filter((r) => r.status === 'active') ?? [];
  const actionableRentals = rentals?.filter((r) => r.status !== 'active' || !r.agreement_signed_at) ?? [];
  const durableActions = unreadNotifications ?? [];
  const unviewedRepairs = (repairActions ?? []).filter((repair) => !viewedRepairIds.includes(repair.id));
  const unviewedPayments = (paymentActions ?? []).filter((payment) => !viewedPaymentIds.includes(payment.id));
  const totalExpected = rentals?.reduce((sum, r) => sum + Number(r.monthly_rent), 0) ?? 0;
  const collected = activeRentals.reduce((sum, r) => sum + Number(r.monthly_rent), 0);
  const collectionRate = totalExpected > 0 ? Math.round((collected / totalExpected) * 100) : 0;
  const firstName = profile?.full_name?.split(' ')[0] || 'Landlord';
  const queueCount = durableActions.length + actionableRentals.length + (durableActions.length ? 0 : unviewedRepairs.length + unviewedPayments.length);
  const firstRentalAction = actionableRentals[0];
  const firstRepairAction = unviewedRepairs[0];
  const firstPaymentAction = unviewedPayments[0];
  const firstDurableAction = durableActions[0];
  const actionSummary = [
    durableActions.length ? `${durableActions.length} notification${durableActions.length === 1 ? '' : 's'}` : null,
    !durableActions.length && unviewedRepairs.length ? `${unviewedRepairs.length} repair${unviewedRepairs.length === 1 ? '' : 's'}` : null,
    !durableActions.length && unviewedPayments.length ? `${unviewedPayments.length} payment${unviewedPayments.length === 1 ? '' : 's'}` : null,
    actionableRentals.length ? `${actionableRentals.length} setup` : null,
  ].filter(Boolean).join(' - ');
  const primaryActionText = firstDurableAction
    ? firstDurableAction.title
    : firstRepairAction
    ? `Repair: ${firstRepairAction.title}`
    : firstPaymentAction
    ? `Payment received: ${formatCurrency(firstPaymentAction.amount, true)}`
    : firstRentalAction
    ? 'Rental setup needs review'
    : 'No landlord tasks need attention.';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']} style={{ flex: 1, backgroundColor: Colors.surface }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refreshDashboard} />}
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
              if (firstDurableAction) {
                router.push('/(landlord)/actions');
              } else if (firstRepairAction?.rental_id) {
                router.push({
                  pathname: '/(landlord)/repairs/[rentalId]',
                  params: { rentalId: firstRepairAction.rental_id },
                });
              } else if (firstPaymentAction) {
                router.push('/(landlord)/payments');
              } else if (firstRentalAction?.property_id) {
                router.push(`/(landlord)/property/${firstRentalAction.property_id}`);
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
                      {queueCount
                        ? `${primaryActionText}${actionSummary ? ` (${actionSummary})` : ''}`
                        : primaryActionText}
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
