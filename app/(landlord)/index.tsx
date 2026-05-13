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
import { formatCurrency, formatDateShort, formatMonth, monthKey } from '../../lib/formatters';
import { RentalCard } from '../../components/rental/RentalCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { RentalCardSkeleton } from '../../components/ui/SkeletonLoader';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Cap, Chip, CollectionRing, DisplayText, InkCard, Sparkline } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';
import { Ionicons } from '@expo/vector-icons';
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

  const { data: recentLedgerPayments } = useQuery({
    queryKey: ['landlord-ledger-preview', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          id, amount, status, month, paid_at, created_at,
          rental:rentals!inner(landlord_id, property:properties(name), tenant:profiles!rentals_tenant_id_fkey(full_name))
        `)
        .eq('rental.landlord_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as unknown as Array<{
        id: string; amount: number; status: string; month: string;
        paid_at: string | null; created_at: string;
        rental?: { property?: { name: string } | null; tenant?: { full_name: string } | null };
      }>;
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const { data: recentLedgerRepairs } = useQuery({
    queryKey: ['landlord-ledger-repairs-preview', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_requests')
        .select(`
          id, title, status, created_at,
          rental:rentals!inner(landlord_id, property:properties(name), tenant:profiles!rentals_tenant_id_fkey(full_name))
        `)
        .eq('rental.landlord_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data as unknown as Array<{
        id: string; title: string; status: string; created_at: string;
        rental?: { property?: { name: string } | null; tenant?: { full_name: string } | null };
      }>;
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const currentMonth = monthKey(new Date());
  const nextMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  const nextMonth = monthKey(nextMonthDate);
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

  // Ended rentals with unsettled deposits
  const endedRentalsWithDeposit = React.useMemo(() =>
    (rentals ?? []).filter((r) => r.status === 'ended' && (r.security_deposit ?? 0) > 0 && !r.property?.archived_at),
    [rentals],
  );

  const { data: settledDepositRentalIds = [] } = useQuery({
    queryKey: ['settled-deposits', endedRentalsWithDeposit.map((r) => r.id)],
    queryFn: async () => {
      if (!endedRentalsWithDeposit.length) return [] as string[];
      const { data, error } = await supabase
        .from('deposit_transactions')
        .select('rental_id')
        .in('rental_id', endedRentalsWithDeposit.map((r) => r.id))
        .eq('type', 'refund');
      if (error) return [] as string[];
      return (data ?? []).map((d: { rental_id: string }) => d.rental_id);
    },
    enabled: endedRentalsWithDeposit.length > 0 && !isLocalDevUser,
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
    const map = new Map<string, {
      representative: Rental;
      count: number;
      totalRent: number;
      totalDeposit: number;
      activeBeds: number;
      totalBeds: number;
    }>();
    for (const rental of rentals ?? []) {
      const key = rental.property_id;
      const notEnded = rental.status !== 'ended';
      if (!map.has(key)) {
        map.set(key, {
          representative: rental,
          count: 1,
          totalRent: notEnded ? Number(rental.monthly_rent) : 0,
          totalDeposit: notEnded ? Number(rental.security_deposit) : 0,
          activeBeds: notEnded && !!rental.tenant_id ? 1 : 0,
          totalBeds: notEnded ? 1 : 0,
        });
      } else {
        const entry = map.get(key)!;
        entry.count++;
        if (notEnded) {
          entry.totalRent += Number(rental.monthly_rent);
          entry.totalDeposit += Number(rental.security_deposit);
          entry.totalBeds++;
          if (rental.tenant_id) entry.activeBeds++;
        }
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
  const pendingVerification = (currentMonthPayments ?? [])
    .filter((p) => p.status === 'pending_verification')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const overdueCount = (currentMonthPayments ?? []).filter((p) => p.status === 'overdue').length;
  const overdueAmount = (currentMonthPayments ?? [])
    .filter((p) => p.status === 'overdue')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const collectionRate = totalExpected > 0 ? Math.round((collected / totalExpected) * 100) : 0;
  const nextMonthExpected = activeRentals
    .filter((rental) => !rental.end_date || new Date(rental.end_date) >= nextMonthDate)
    .reduce((sum, rental) => sum + Number(rental.monthly_rent), 0);
  const upcomingEndings = currentRentals
    .filter((rental) => rental.status !== 'ended' && rental.end_date)
    .map((rental) => {
      const daysLeft = Math.ceil((new Date(rental.end_date!).getTime() - Date.now()) / 86_400_000);
      return { rental, daysLeft };
    })
    .filter((item) => item.daysLeft >= 0 && item.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const closestEnding = upcomingEndings[0];
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

  const unsettledEndedRentals = endedRentalsWithDeposit.filter((r) => !settledDepositRentalIds.includes(r.id));

  return (
  <DashboardShell role="landlord">
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
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View className="px-5 pt-4 gap-4">
          <InkCard>
            <View className="flex-row justify-between items-center">
              <Cap style={{ color: 'rgba(255,255,255,0.55)' }}>Collection</Cap>
              <Cap style={{ color: 'rgba(255,255,255,0.55)' }}>{formatMonth(currentMonth)}</Cap>
            </View>
            <View className="flex-row items-center mt-4">
              <CollectionRing value={collectionRate} label={`${collectionRate}%`} sublabel="Collected" inverse />
              <View style={{ marginLeft: 14, flex: 1, minWidth: 0 }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.mono, fontSize: 10 }}>
                  EXPECTED THIS MONTH
                </Text>
                <DisplayText
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                  style={{ color: Colors.surface, fontSize: 32, lineHeight: 36 }}
                >
                  {formatCurrency(totalExpected, true)}
                </DisplayText>
                <View className="flex-row gap-5 mt-3">
                  <MoneyStat label="Paid" value={formatCurrency(collected, true)} />
                  <MoneyStat label={pendingVerification ? 'To confirm' : 'Pending'} value={formatCurrency(pendingVerification || Math.max(totalExpected - collected, 0), true)} warn />
                </View>
              </View>
            </View>
            <View
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row',
                gap: 12,
              }}
            >
              <CollectionForecast
                label={`Next: ${formatMonth(nextMonth)}`}
                value={formatCurrency(nextMonthExpected, true)}
                note={`${activeRentals.length} active rental${activeRentals.length === 1 ? '' : 's'}`}
              />
              <CollectionForecast
                label="Closing soon"
                value={closestEnding ? `${closestEnding.daysLeft}d` : 'None'}
                note={
                  closestEnding
                    ? `${closestEnding.rental.property?.name ?? 'Rental'} ends ${formatDateShort(closestEnding.rental.end_date!)}`
                    : 'No lease ends in 60 days'
                }
                warn={!!closestEnding}
              />
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
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: queueCount ? Colors.warning : Colors.success, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name={queueCount ? 'alert' : 'checkmark'} size={18} color="#fff" />
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
                <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
              </View>
            </Card>
          </TouchableOpacity>

          {overdueCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(landlord)/payments')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: Colors.dangerSoft, borderRadius: 16,
                padding: 14, borderWidth: 1, borderColor: '#F5B8B5',
              }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="alert-circle" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.danger, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
                  {overdueCount} overdue {overdueCount === 1 ? 'payment' : 'payments'}
                </Text>
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 1 }}>
                  {formatCurrency(overdueAmount, true)} unpaid this month · Tap to review
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.danger} />
            </TouchableOpacity>
          )}

          {unsettledEndedRentals.length > 0 && (
            <View style={{
              backgroundColor: '#FFF7ED', borderRadius: 16,
              borderWidth: 1, borderColor: '#FED7AA',
              padding: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="wallet-outline" size={18} color={Colors.warning} />
                <Text style={{ color: Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 15, flex: 1 }}>
                  {unsettledEndedRentals.length === 1 ? 'Deposit refund pending' : `${unsettledEndedRentals.length} deposit refunds pending`}
                </Text>
              </View>
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 10 }}>
                {unsettledEndedRentals.length === 1
                  ? 'One ended rental still has an unsettled deposit. Settle it to close your books.'
                  : `${unsettledEndedRentals.length} ended rentals still have unsettled deposits. Settle them to close your books.`}
              </Text>
              {unsettledEndedRentals.slice(0, 3).map((r, i) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => router.push(`/(landlord)/property/${r.property_id}`)}
                  activeOpacity={0.78}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingVertical: 10,
                    borderTopWidth: 1, borderTopColor: '#FED7AA',
                  }}
                >
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 14, flex: 1 }}>
                    {r.property?.name ?? 'Property'}
                    {r.tenant?.full_name ? ` · ${r.tenant.full_name.split(' ')[0]}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>
                      {formatCurrency(r.security_deposit, true)}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.warning} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View className="flex-row gap-3">
            <MiniPanel label="Properties" value={String(currentPropertyCount)}>
              <View className="flex-row gap-2 mt-2">
                <Chip tone="good">{activeRentals.length} active</Chip>
                {archivedPropertyCount > 0 && <Chip tone="outline">{archivedPropertyCount} archived</Chip>}
              </View>
              {currentPropertyCount > 0 && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 10 }}>
                    OCCUPANCY
                  </Text>
                  <Text style={{
                    color: activePropertyCount / currentPropertyCount >= 0.8 ? Colors.success : Colors.warning,
                    fontFamily: Fonts.sansSemiBold, fontSize: 13,
                  }}>
                    {Math.round((activePropertyCount / currentPropertyCount) * 100)}%
                  </Text>
                </View>
              )}
            </MiniPanel>
            <MiniPanel label="YTD income" value={formatCurrency(ytdTotal, true)}>
              <Sparkline points={ytdSparkline.length ? ytdSparkline : [0, 0, 0, 0, 0, 0]} height={32} />
            </MiniPanel>
          </View>

          <LandlordScoreCard
            collectionRate={collectionRate}
            ytdPaymentCount={(ytdPayments ?? []).length}
            occupancyRate={currentPropertyCount > 0 ? Math.round((activePropertyCount / currentPropertyCount) * 100) : 100}
          />

          {/* ── Inline mini-ledger ── */}
          <DashboardLedger
            payments={recentLedgerPayments ?? []}
            repairs={recentLedgerRepairs ?? []}
            onViewAll={() => router.push('/(landlord)/ledger' as never)}
          />

          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-3">
              <TouchableOpacity onPress={() => router.push('/(landlord)/properties' as never)} activeOpacity={0.75}>
                <Cap>Your properties ({filteredPropertyGroups.length}) →</Cap>
              </TouchableOpacity>
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
                      numberOfLines={1}
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
            ) : rentals?.length === 0 && portfolioFilter === 'current' ? (
              <LandlordOnboardingCard onStart={() => router.push('/(landlord)/create-rental')} />
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
              filteredPropertyGroups.map(({ representative, count, totalRent, totalDeposit, activeBeds, totalBeds }) => (
                <RentalCard
                  key={representative.property_id}
                  rental={representative}
                  role="landlord"
                  rentalCount={count}
                  totalRent={totalRent}
                  totalDeposit={totalDeposit}
                  activeBeds={activeBeds}
                  totalBeds={totalBeds}
                />
              ))
            )}

            {actionableRentals.length > 0 && (
              <SetupChecklist rentals={actionableRentals} onPress={(r) => router.push(`/(landlord)/property/${r.property_id}`)} />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  </DashboardShell>
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

function CollectionForecast({
  label,
  value,
  note,
  warn = false,
}: {
  label: string;
  value: string;
  note: string;
  warn?: boolean;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Cap style={{ color: warn ? '#FFC56B' : 'rgba(255,255,255,0.5)' }}>{label}</Cap>
      <Text
        numberOfLines={1}
        style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginTop: 3 }}
      >
        {value}
      </Text>
      <Text
        numberOfLines={2}
        style={{ color: 'rgba(255,255,255,0.58)', fontFamily: Fonts.sans, fontSize: 11, lineHeight: 15, marginTop: 2 }}
      >
        {note}
      </Text>
    </View>
  );
}

function MiniPanel({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <Card className="flex-1" style={{ minHeight: 118 }}>
      <Cap numberOfLines={1}>{label}</Cap>
      <DisplayText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        style={{ fontSize: 28, lineHeight: 32, marginTop: 6 }}
      >
        {value}
      </DisplayText>
      {children}
    </Card>
  );
}

const ONBOARDING_STEPS = [
  {
    icon: '🏠',
    title: 'Add your property',
    desc: 'Name, address, and rent details — 2 minutes.',
  },
  {
    icon: '🔗',
    title: 'Share the invite link',
    desc: 'Your tenant gets a private link — no sign-up friction.',
  },
  {
    icon: '✅',
    title: 'Rent tracks itself',
    desc: 'Payments, receipts, and photo proof — fully automatic.',
  },
];

function LandlordOnboardingCard({ onStart }: { onStart: () => void }) {
  return (
    <View style={{ marginTop: 8 }}>
      {/* Hero */}
      <View
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: Colors.primary,
          padding: 24,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 18 }}>🏡</Text>
          </View>
          <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 13, opacity: 0.6, letterSpacing: 0.5 }}>
            WELCOME TO RENTYBASE
          </Text>
        </View>

        <Text style={{ color: Colors.surface, fontFamily: Fonts.sansBold, fontSize: 26, lineHeight: 32, marginBottom: 10 }}>
          Your first rental is{'\n'}3 steps away.
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
          No spreadsheets. No WhatsApp receipts. Rent tracks itself — with photo proof and HRA receipts built in.
        </Text>

        {/* Steps */}
        {ONBOARDING_STEPS.map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: i < 2 ? 16 : 0 }}>
            {/* connector line */}
            <View style={{ alignItems: 'center', width: 36 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 18 }}>{step.icon}</Text>
              </View>
              {i < 2 && (
                <View style={{ width: 2, height: 16, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 3 }} />
              )}
            </View>
            <View style={{ flex: 1, paddingTop: 6 }}>
              <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>{step.title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, marginTop: 2 }}>{step.desc}</Text>
            </View>
          </View>
        ))}

        {/* CTA */}
        <TouchableOpacity
          onPress={onStart}
          activeOpacity={0.85}
          style={{
            marginTop: 24,
            backgroundColor: Colors.surface,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 15 }}>
            Add your first property
          </Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Trust strip */}
      <View
        style={{
          backgroundColor: Colors.fill ?? '#F5F5F5',
          borderRadius: 14,
          padding: 16,
          flexDirection: 'row',
          gap: 0,
        }}
      >
        {[
          { icon: '📸', text: 'Photo proof\non move-in & out' },
          { icon: '🧾', text: 'HRA receipts\nin one tap' },
          { icon: '🔒', text: 'Deposit ledger\nautomatically tracked' },
        ].map((item, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 10, textAlign: 'center', lineHeight: 14 }}>
              {item.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Dashboard mini-ledger ─────────────────────────────────────────────────────

type LedgerTag = 'in' | 'out' | 'doc' | 'sys';
interface MiniEntry { id: string; date: string; title: string; who: string; amount: number; tag: LedgerTag }

const DASH_TAG: Record<LedgerTag, { label: string; color: string; bg: string }> = {
  in:  { label: 'IN',  color: Colors.success, bg: Colors.successSoft },
  out: { label: 'OUT', color: Colors.warning,  bg: Colors.warningSoft },
  doc: { label: 'DOC', color: '#C97A3A',       bg: '#FBF1E8'         },
  sys: { label: 'SYS', color: Colors.muted,    bg: Colors.fill2      },
};

function buildMiniLedger(
  payments: Array<{ id: string; amount: number; status: string; month: string; paid_at: string | null; created_at: string; rental?: { property?: { name: string } | null; tenant?: { full_name: string } | null } }>,
  repairs: Array<{ id: string; title: string; status: string; created_at: string; rental?: { property?: { name: string } | null; tenant?: { full_name: string } | null } }>,
): MiniEntry[] {
  const entries: MiniEntry[] = [];

  payments.forEach((p) => {
    const name = p.rental?.tenant?.full_name?.split(' ')[0] ?? 'Tenant';
    const prop = p.rental?.property?.name ?? 'Property';
    if (p.status === 'paid') {
      entries.push({ id: `p-${p.id}`, date: p.paid_at ?? p.created_at, title: `Rent · ${formatMonth(p.month)}`, who: `${name} · ${prop}`, amount: p.amount, tag: 'in' });
    } else if (p.status === 'pending_verification') {
      entries.push({ id: `pv-${p.id}`, date: p.created_at, title: `Payment submitted · ${formatMonth(p.month)}`, who: `${name} · ${prop}`, amount: p.amount, tag: 'sys' });
    } else if (p.status === 'overdue') {
      entries.push({ id: `po-${p.id}`, date: p.created_at, title: `Rent overdue · ${formatMonth(p.month)}`, who: `${name} · ${prop}`, amount: p.amount, tag: 'sys' });
    }
  });

  repairs.forEach((r) => {
    const name = r.rental?.tenant?.full_name?.split(' ')[0] ?? 'Tenant';
    const prop = r.rental?.property?.name ?? 'Property';
    entries.push({ id: `r-${r.id}`, date: r.created_at, title: `Repair · ${r.title}`, who: `${name} · ${prop}`, amount: 0, tag: r.status === 'resolved' || r.status === 'closed' ? 'doc' : 'sys' });
  });

  return entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);
}

function DashboardLedger({
  payments,
  repairs,
  onViewAll,
}: {
  payments: Parameters<typeof buildMiniLedger>[0];
  repairs: Parameters<typeof buildMiniLedger>[1];
  onViewAll: () => void;
}) {
  const entries = buildMiniLedger(payments, repairs);

  return (
    <View style={{ backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <View>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>Activity Ledger</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="lock-closed-outline" size={10} color={Colors.muted} />
            <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10 }}>Sealed · append-only</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ color: Colors.action, fontFamily: Fonts.sansMedium, fontSize: 13 }}>View all</Text>
          <Ionicons name="chevron-forward" size={13} color={Colors.action} />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: Colors.border }} />

      {/* Rows */}
      {entries.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>No activity yet</Text>
        </View>
      ) : (
        entries.map((e, i) => {
          const { label, color, bg } = DASH_TAG[e.tag];
          return (
            <View
              key={e.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingHorizontal: 16, paddingVertical: 11,
                borderBottomWidth: i < entries.length - 1 ? 1 : 0,
                borderBottomColor: Colors.borderSoft,
              }}
            >
              {/* Tag */}
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: bg }}>
                <Text style={{ color, fontFamily: Fonts.sansBold, fontSize: 9, letterSpacing: 0.3 }}>{label}</Text>
              </View>

              {/* Content */}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>{e.title}</Text>
                <Text numberOfLines={1} style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11, marginTop: 1 }}>{e.who}</Text>
              </View>

              {/* Amount + date */}
              <View style={{ alignItems: 'flex-end' }}>
                {e.amount > 0 ? (
                  <Text style={{ color: e.tag === 'in' ? Colors.success : Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>
                    {e.tag === 'in' ? '+' : '−'}{formatCurrency(e.amount, true)}
                  </Text>
                ) : (
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 11 }}>—</Text>
                )}
                <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, marginTop: 1 }}>{formatDateShort(e.date)}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function scoreBand(score: number) {
  if (score >= 850) return { label: 'EXCELLENT', color: Colors.success };
  if (score >= 750) return { label: 'TRUSTED',   color: Colors.action  };
  if (score >= 650) return { label: 'GOOD',      color: Colors.warning };
  if (score >= 550) return { label: 'FAIR',      color: '#B8740F'      };
  return               { label: 'BUILDING',  color: Colors.muted   };
}

function LandlordScoreCard({
  collectionRate,
  ytdPaymentCount,
  occupancyRate,
}: { collectionRate: number; ytdPaymentCount: number; occupancyRate: number }) {
  const score = Math.min(900, Math.round(
    680 +
    (collectionRate * 0.8) +
    Math.min(ytdPaymentCount * 3, 60) +
    (occupancyRate * 0.4)
  ));
  const { label: band, color } = scoreBand(score);
  const metrics = [
    { label: 'Collection rate', pct: collectionRate, sublabel: `${collectionRate}%` },
    { label: 'Occupancy',       pct: occupancyRate,  sublabel: `${occupancyRate}%` },
    { label: 'Receipts issued', pct: Math.min(ytdPaymentCount * 8, 100), sublabel: `${ytdPaymentCount} this year` },
  ];
  return (
    <View style={{
      backgroundColor: Colors.surface, borderRadius: 20,
      borderWidth: 1, borderColor: Colors.border, padding: 18,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <View>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>LANDLORD SCORE</Text>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 38, lineHeight: 40 }}>{score}</Text>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10 }}> / 900</Text>
        </View>
        <View style={{
          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
          backgroundColor: color + '18',
        }}>
          <Text style={{ color, fontFamily: Fonts.sansBold, fontSize: 12, letterSpacing: 0.5 }}>{band}</Text>
        </View>
      </View>
      {metrics.map((m, i) => (
        <View key={i} style={{ marginBottom: i < 2 ? 10 : 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12 }}>{m.label}</Text>
            <Text style={{ color: Colors.ink2, fontFamily: Fonts.sansMedium, fontSize: 12 }}>{m.sublabel}</Text>
          </View>
          <View style={{ height: 5, backgroundColor: Colors.fill2, borderRadius: 3 }}>
            <View style={{ height: 5, width: `${m.pct}%`, backgroundColor: color, borderRadius: 3 }} />
          </View>
        </View>
      ))}
    </View>
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
