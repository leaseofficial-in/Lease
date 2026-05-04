import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Proof, Rental, RentPayment, RepairRequest } from '../../types';
import { formatCurrency, formatPhone } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { RentStatusBadge } from '../../components/rental/RentStatusBadge';
import { ActivityFeed } from '../../components/rental/ActivityFeed';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { Cap, Chip, CollectionRing, InkCard, Sparkline } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { isDevAuthUserId } from '../../lib/devAuth';
import { buildRentalActivity } from '../../lib/rentalActivity';

export default function TenantDashboard() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: rental, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select(`*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(*)`)
        .eq('tenant_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Rental | null;
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const { data: currentPayment } = useQuery({
    queryKey: ['current-payment', rental?.id],
    queryFn: async () => {
      const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rental!.id)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data as RentPayment | null;
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { data: recentPayments } = useQuery({
    queryKey: ['tenant-payments-preview', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data as RentPayment[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { data: recentRepairs } = useQuery({
    queryKey: ['tenant-repairs-preview', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data as RepairRequest[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { data: unreadNotifCount } = useQuery({
    queryKey: ['tenant-unread-notifications', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .eq('read', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profile?.id,
  });

  const { data: recentProofs } = useQuery({
    queryKey: ['tenant-proofs-preview', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as Proof[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  useEffect(() => {
    if (isLoading || isLocalDevUser) return;
    AsyncStorage.getItem('flatvio.pending_join_token').then((pendingToken) => {
      if (!pendingToken) return;
      AsyncStorage.removeItem('flatvio.pending_join_token');
      if (!rental) {
        router.push({ pathname: '/(tenant)/join', params: { prefillToken: pendingToken } });
      }
    });
  }, [isLoading, isLocalDevUser, rental, router]);

  if (isLoading) return <LoadingScreen />;
  const activity = rental
    ? buildRentalActivity({
        rental,
        payments: recentPayments ?? (currentPayment ? [currentPayment] : []),
        repairs: recentRepairs ?? [],
        proofs: recentProofs ?? [],
      })
    : [];

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Cap>Tenant Home</Cap>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 22, marginTop: 4 }}>
              {profile?.full_name?.split(' ')[0] || 'Flatvio'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={() => router.push('/(tenant)/notifications')}
              activeOpacity={0.75}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
              {(unreadNotifCount ?? 0) > 0 && (
                <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger, borderWidth: 1.5, borderColor: Colors.background }} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tenant)/profile')} activeOpacity={0.75}>
              <Avatar name={profile?.full_name ?? 'T'} uri={profile?.avatar_url} size={42} />
            </TouchableOpacity>
          </View>
        </View>

        {!rental ? (
          <View className="px-5 pt-8">
            <EmptyState
              title="No rental yet"
              subtitle="Ask your landlord for an invite link, then join the rental from here."
              actionLabel="Join via Link"
              onAction={() => router.push('/(tenant)/join')}
              icon={<Text style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 32 }}>F</Text>}
            />
          </View>
        ) : (
          <View className="px-5 pt-2 gap-4">
            <InkCard>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Cap style={{ color: 'rgba(255,255,255,0.58)' }}>Current Rental</Cap>
                  <Text
                    numberOfLines={2}
                    style={{ color: Colors.surface, fontFamily: Fonts.serif, fontSize: 36, lineHeight: 37, marginTop: 8 }}
                  >
                    {rental.property?.name ?? 'Your home'}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{ color: 'rgba(255,255,255,0.68)', fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 10 }}
                  >
                    {rental.property?.address_line1}, {rental.property?.city}
                  </Text>
                </View>
                <CollectionRing value={currentPayment?.status === 'paid' ? 100 : 0} label={currentPayment?.status === 'paid' ? 'Paid' : 'Due'} inverse />
              </View>

              <View className="flex-row mt-6 gap-2">
                <Chip tone={rental.status === 'active' ? 'good' : 'warn'}>
                  {rental.status === 'active' ? 'Active' : 'Setup'}
                </Chip>
                <Chip tone="outline" inverse>{formatCurrency(rental.monthly_rent, true)}/mo</Chip>
              </View>
            </InkCard>

            {currentPayment?.status === 'overdue' && (
              <Card style={{ backgroundColor: Colors.dangerSoft, borderColor: '#F5B8B5' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="alert-circle" size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.danger, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>Rent Overdue</Text>
                    <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 }}>
                      Payment was due on the {rental.rent_due_day}th. Pay now to avoid late fees.
                    </Text>
                  </View>
                </View>
                <Button title="Pay Now — Overdue" variant="danger" onPress={() => router.push('/(tenant)/pay-rent')} fullWidth size="lg" />
              </Card>
            )}

            {currentPayment && (
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Cap>This Month</Cap>
                  <StatusPill kind="payment" value={currentPayment.status} />
                </View>
                <RentStatusBadge payment={currentPayment} />
                {currentPayment.status !== 'paid' && currentPayment.status !== 'overdue' && (
                  <Button
                    title="Pay Now"
                    onPress={() => router.push('/(tenant)/pay-rent')}
                    fullWidth
                    size="lg"
                    style={{ marginTop: 10 }}
                  />
                )}
              </Card>
            )}

            {rental.status === 'pending_moveout' && (
              <Card style={{ backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Ionicons name="exit-outline" size={20} color="#7C3AED" />
                  <Text style={{ color: '#7C3AED', fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
                    Move-out requested
                  </Text>
                </View>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
                  Your landlord has initiated a move-out. Please upload photos of all rooms to complete the handover.
                </Text>
                <Button
                  title="Upload Move-out Photos"
                  onPress={() => router.push({ pathname: '/(tenant)/proof/upload', params: { type: 'move_out' } })}
                  fullWidth
                />
              </Card>
            )}

            <View className="flex-row gap-3">
              <ActionTile label="Proof" icon="camera-outline" onPress={() => router.push('/(tenant)/proof/upload')} />
              <ActionTile label="Agreement" icon="document-text-outline" onPress={() => router.push('/(tenant)/agreement')} />
              <ActionTile label="Rent" icon="receipt-outline" onPress={() => router.push('/(tenant)/rent-history')} />
              <ActionTile label="Repairs" icon="construct-outline" onPress={() => router.push('/(tenant)/repairs')} />
            </View>

            <Card>
              <View className="flex-row items-center justify-between mb-3">
                <Cap>Rental Terms</Cap>
                <StatusPill kind="rental" value={rental.status} />
              </View>
              <Sparkline points={[12, 14, 13, 18, 16, 22, 21, 25]} height={42} />
              <View className="flex-row justify-between mt-4">
                <InfoItem label="Rent" value={`${formatCurrency(rental.monthly_rent, true)}/mo`} />
                <InfoItem label="Deposit" value={formatCurrency(rental.security_deposit, true)} />
                <InfoItem label="Due Day" value={`${rental.rent_due_day}`} align="right" />
              </View>
            </Card>

            {rental.landlord && (
              <Card>
                <Cap style={{ marginBottom: 12 }}>Your Landlord</Cap>
                <View className="flex-row items-center">
                  <Avatar
                    name={rental.landlord.full_name || 'Landlord'}
                    uri={rental.landlord.avatar_url}
                    size={44}
                  />
                  <View className="ml-3 flex-1">
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
                      {rental.landlord.full_name || 'Name not set'}
                    </Text>
                    <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, marginTop: 2 }}>
                      {formatPhone(rental.landlord.phone)}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            <Card>
              <View className="flex-row items-center justify-between mb-1">
                <Cap>Timeline</Cap>
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11 }}>
                  Shared ledger
                </Text>
              </View>
              <ActivityFeed items={activity} limit={5} />
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionTile({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, minHeight: 86, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }}
      activeOpacity={0.78}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
        <Ionicons name={icon} size={17} color={Colors.primary} />
      </View>
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoItem({
  label,
  value,
  align = 'left',
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
}) {
  return (
    <View style={{ flex: 1, alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}
