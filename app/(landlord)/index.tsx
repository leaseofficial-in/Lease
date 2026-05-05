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
import { formatCurrency, monthKey } from '../../lib/formatters';
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

type PortfolioFilter = 'current' | 'active' | 'setup' | 'ended' | 'archived';

export default function LandlordDashboard() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);
  const [portfolioFilter, setPortfolioFilter] = React.useState<PortfolioFilter>('current');

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
        .eq('status', 'pending_verification')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as LandlordPaymentAction[];
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const currentMonth = monthKey(new Date());
  const currentYear = new Date().getFullYear();

  const { data: currentMonthPayments, refetch: refetchCurrentMonthPayments } = useQuery({
    queryKey: ['landlord-month-payments', profile?.id, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          id,
          rental_id,
          amount,
          status,
          month,
          rental:rentals!inner(landlord_id)
        `)
        .eq('rental.landlord_id', profile!.id)
        .eq('month', currentMonth);
      if (error) throw error;
      return data as unknown as { id: string; rental_id: string; amount: number; status: string; month: string }[];
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const { data: ytdPayments, refetch: refetchYtdPayments } = useQuery({
    queryKey: ['landlord-ytd-payments', profile?.id, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          id,
          amount,
          month,
          rental:rentals!inner(landlord_id)
        `)
        .eq('rental.landlord_id', profile!.id)
        .eq('status', 'paid')
        .gte('month', `${currentYear}-01-01`)
        .lte('month', `${currentYear}-12-01`)
        .order('month', { ascending: true });
      if (error) throw error;
      return data as unknown as { id: string; amount: number; month: string }[];
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
        void refetchCurrentMonthPayments();
        void refetchYtdPayments();
      }
    }, [isLocalDevUser, refetchPaymentActions, refetchRepairActions, refetchUnreadNotifications, refetchViewedPaymentIds, refetchViewedRepairIds, refetchCurrentMonthPayments, refetchYtdPayments]),
  );

  const refreshDashboard = async () => {
    await Promise.all([
      refetch(),
      !isLocalDevUser ? refetchUnreadNotifications() : Promise.resolve(),
      !isLocalDevUser ? refetchRepairActions() : Promise.resolve(),
      !isLocalDevUser ? refetchPaymentActions() : Promise.resolve(),
      !isLocalDevUser ? refetchCurrentMonthPayments() : Promise.resolve(),
      !isLocalDevUser ? refetchYtdPayments() : Promise.resolve(),
      refetchViewedRepairIds(),
      refetchViewedPaymentIds(),
    ]);
  };

  // Group by property — one card per physical property, prefer non-ended rental as representative
  const propertyGroups = React.useMemo(() => {
    const map = new Map<string, { representative: Rental; count: number }>();
    for (const rental of rentals ?? []) {
      const key = rental.property_id;
      if (!map.has(key)) {
        map.set(key, { representative: rental, count: 1 });
      } else {
        const entry = map.get(key)!;
        entry.count++;
        // Prefer non-ended over ended; if same, prefer more recent updated_at
        const repIsEnded = entry.representative.status === 'ended';
        const curIsEnded = rental.status === 'ended';
        if (repIsEnded && !curIsEnded) entry.representative = rental;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.representative.updated_at.localeCompare(a.representative.updated_at),
    );
  }, [rentals]);

  const currentRentals = rentals?.filter((r) => !r.property?.archived_at) ?? [];
  const activeRentals = currentRentals.filter((r) => r.status === 'active');
  const actionableRentals = currentRentals.filter((r) => r.status !== 'active' || !r.agreement_signed_at);
  const currentPropertyCount = propertyGroups.filter(({ representative }) =>
    !representative.property?.archived_at && representative.status !== 'ended',
  ).length;
  const activePropertyCount = propertyGroups.filter(({ representative }) =>
    !representative.property?.archived_at && (representative.status === 'active' || representative.status === 'pending_moveout'),
  ).length;
  const setupPropertyCount = propertyGroups.filter(({ representative }) =>
    !representative.property?.archived_at && (representative.status === 'pending_tenant' || representative.status === 'pending_proof'),
  ).length;
  const endedPropertyCount = propertyGroups.filter(({ representative }) =>
    !representative.property?.archived_at && representative.status === 'ended',
  ).length;
  const archivedPropertyCount = propertyGroups.filter(({ representative }) => !!representative.property?.archived_at).length;
  const filteredPropertyGroups = propertyGroups.filter(({ representative }) => {
    const archived = !!representative.property?.archived_at;
    if (portfolioFilter === 'archived') return archived;
    if (archived) return false;
    if (portfolioFilter === 'active') return representative.status === 'active' || representative.status === 'pending_moveout';
    if (portfolioFilter === 'setup') return representative.status === 'pending_tenant' || representative.status === 'pending_proof';
    if (portfolioFilter === 'ended') return representative.status === 'ended';
    return representative.status !== 'ended';
  });
  const portfolioFilters: { key: PortfolioFilter; label: string; count: number }[] = [
    { key: 'current', label: 'Current', count: currentPropertyCount },
    { key: 'active', label: 'Active', count: activePropertyCount },
    { key: 'setup', label: 'Setup', count: setupPropertyCount },
    { key: 'ended', label: 'Ended', count: endedPropertyCount },
    { key: 'archived', label: 'Archived', count: archivedPropertyCount },
  ];
  const durableActions = unreadNotifications ?? [];
  const unviewedRepairs = (repairActions ?? []).filter((repair) => !viewedRepairIds.includes(repair.id));
  const unviewedPayments = (paymentActions ?? []).filter((payment) => !viewedPaymentIds.includes(payment.id));
  const totalExpected = activeRentals.reduce((sum, r) => sum + Number(r.monthly_rent), 0);
  const collected = (currentMonthPayments ?? [])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const collectionRate = totalExpected > 0 ? Math.round((collected / totalExpected) * 100) : 0;
  const ytdTotal = (ytdPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const ytdSparkline = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, new Date().getMonth() - 5 + i, 1);
    const key = monthKey(d);
    return (ytdPayments ?? []).filter((p) => p.month === key).reduce((s, p) => s + Number(p.amount), 0);
  });
  const firstName = profile?.full_name?.split(' ')[0] || 'Landlord';
  const queueCount = durableActions.length + actionableRentals.length + (durableActions.length ? 0 : unviewedRepairs.length + unviewedPayments.length);
  const firstRentalAction = actionableRentals[0];
  const firstRepairAction = unviewedRepairs[0];
  const firstPaymentAction = unviewedPayments[0];
  const firstDurableAction = durableActions[0];
  const actionSummary = [
    durableActions.length ? `${durableActions.length} notification${durableActions.length === 1 ? '' : 's'}` : null,
    !durableActions.length && unviewedRepairs.length ? `${unviewedRepairs.length} repair${unviewedRepairs.length === 1 ? '' : 's'}` : null,
    !durableActions.length && unviewedPayments.length ? `${unviewedPayments.length} payment${unviewedPayments.length === 1 ? '' : 's'} to confirm` : null,
    actionableRentals.length ? `${actionableRentals.length} setup` : null,
  ].filter(Boolean).join(' - ');
  const primaryActionText = firstDurableAction
    ? firstDurableAction.title
    : firstRepairAction
    ? `Repair: ${firstRepairAction.title}`
    : firstPaymentAction
    ? `Confirm ${formatCurrency(firstPaymentAction.amount, true)} from ${firstPaymentAction.rental?.property?.name ?? 'tenant'}`
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
              } else if (firstPaymentAction?.rental?.property_id) {
                router.push(`/(landlord)/property/${firstPaymentAction.rental.property_id}`);
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
            <MiniPanel label="Properties" value={String(currentPropertyCount)}>
              <View className="flex-row gap-2 mt-2">
                <Chip tone="good">{activeRentals.length} active</Chip>
                {archivedPropertyCount > 0 && <Chip tone="outline">{archivedPropertyCount} archived</Chip>}
              </View>
            </MiniPanel>
            <MiniPanel label="YTD income" value={formatCurrency(ytdTotal, true)}>
              <Sparkline points={ytdSparkline.length ? ytdSparkline : [0, 0, 0, 0, 0, 0]} height={32} />
            </MiniPanel>
          </View>

          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-3">
              <Cap>Your properties ({filteredPropertyGroups.length})</Cap>
              <TouchableOpacity onPress={() => router.push('/(landlord)/create-rental')}>
                <Cap style={{ color: Colors.primary }}>+ Add</Cap>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              {portfolioFilters.map((filter) => {
                const selected = portfolioFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() => setPortfolioFilter(filter.key)}
                    activeOpacity={0.75}
                    style={{
                      minHeight: 34,
                      paddingHorizontal: 13,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: selected ? Colors.primary : Colors.border,
                      backgroundColor: selected ? Colors.primary : Colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? Colors.surface : Colors.primary,
                        fontFamily: Fonts.sansSemiBold,
                        fontSize: 12,
                      }}
                    >
                      {filter.label} {filter.count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {isLoading ? (
              <>
                <RentalCardSkeleton />
                <RentalCardSkeleton />
              </>
            ) : filteredPropertyGroups.length === 0 ? (
              <EmptyState
                title={portfolioFilter === 'archived' ? 'No archived places' : 'No places here'}
                subtitle={
                  portfolioFilter === 'archived'
                    ? 'Archived places will appear here when you hide old records from the active portfolio.'
                    : 'Create a rental or switch filters to view another part of your portfolio.'
                }
                actionLabel={portfolioFilter === 'current' ? 'Create Rental' : undefined}
                onAction={portfolioFilter === 'current' ? () => router.push('/(landlord)/create-rental') : undefined}
                icon={<Text style={{ fontSize: 42 }}>+</Text>}
              />
            ) : (
              filteredPropertyGroups.map(({ representative, count }) => (
                <RentalCard key={representative.property_id} rental={representative} role="landlord" rentalCount={count} />
              ))
            )}

            {actionableRentals.length > 0 && (
              <SetupChecklist rentals={actionableRentals} onPress={(r) => router.push(`/(landlord)/property/${r.property_id}`)} />
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

const SETUP_STEPS: { status: Rental['status']; label: string }[] = [
  { status: 'pending_tenant', label: 'Invite sent' },
  { status: 'pending_proof', label: 'Tenant joined' },
  { status: 'active', label: 'Rental active' },
];

function setupStep(status: Rental['status']): number {
  if (status === 'pending_tenant') return 0;
  if (status === 'pending_proof') return 1;
  if (status === 'active') return 2;
  if (status === 'pending_moveout') return 3;
  return 3;
}

function SetupChecklist({ rentals, onPress }: { rentals: Rental[]; onPress: (r: Rental) => void }) {
  const pendingSetup = rentals.filter((r) => r.status === 'pending_tenant' || r.status === 'pending_proof');
  if (!pendingSetup.length) return null;

  return (
    <Card style={{ marginTop: 12 }}>
      <Cap style={{ marginBottom: 10 }}>Setup in progress</Cap>
      {pendingSetup.map((rental) => {
        const step = setupStep(rental.status);
        return (
          <TouchableOpacity
            key={rental.id}
            onPress={() => onPress(rental)}
            activeOpacity={0.8}
            style={{ marginBottom: 14 }}
          >
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>
              {rental.property?.name ?? 'Rental'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
              {SETUP_STEPS.map((s, i) => {
                const done = i < step;
                const current = i === step;
                return (
                  <React.Fragment key={s.label}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: done ? Colors.success : current ? Colors.action : Colors.fill,
                        borderWidth: current ? 2 : 0,
                        borderColor: Colors.action,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {done && <Text style={{ color: Colors.surface, fontSize: 11, fontFamily: Fonts.sansBold }}>✓</Text>}
                        {current && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.action }} />}
                      </View>
                      <Text style={{
                        color: done ? Colors.success : current ? Colors.action : Colors.muted,
                        fontFamily: Fonts.sans, fontSize: 9, marginTop: 4, textAlign: 'center',
                      }}>
                        {s.label}
                      </Text>
                    </View>
                    {i < SETUP_STEPS.length - 1 && (
                      <View style={{
                        flex: 1, height: 2, marginBottom: 14,
                        backgroundColor: done ? Colors.success : Colors.fill,
                        marginHorizontal: 2,
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </TouchableOpacity>
        );
      })}
    </Card>
  );
}
