import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Rental, RentPayment } from '../../types';
import { formatCurrency, formatDate, formatMonth, formatPhone } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { RentStatusBadge } from '../../components/rental/RentStatusBadge';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { isDevAuthUserId } from '../../lib/devAuth';

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
        .single();
      if (error && error.code !== 'PGRST116') throw error;
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

  useEffect(() => {
    if (isLoading || isLocalDevUser) return;
    AsyncStorage.getItem('flatvio.pending_join_token').then((pendingToken) => {
      if (!pendingToken) return;
      AsyncStorage.removeItem('flatvio.pending_join_token');
      if (!rental) {
        router.push({ pathname: '/(tenant)/join', params: { prefillToken: pendingToken } });
      }
    });
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-muted">Hello,</Text>
            <Text className="text-xl font-bold text-primary">
              {profile?.full_name?.split(' ')[0] || 'Tenant'} 👋
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tenant)/profile')}>
            <Avatar name={profile?.full_name ?? 'T'} uri={profile?.avatar_url} size={42} />
          </TouchableOpacity>
        </View>

        {!rental ? (
          <View className="px-5 pt-8">
            <EmptyState
              title="No rental yet"
              subtitle="Ask your landlord to share an invite link to join your rental."
              actionLabel="Join via Link"
              onAction={() => router.push('/(tenant)/join')}
              icon={<Text style={{ fontSize: 48 }}>🔗</Text>}
            />
          </View>
        ) : (
          <View className="px-5 pt-2 pb-8 gap-4">
            {/* Property card */}
            <Card>
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-primary" numberOfLines={1}>
                    {rental.property?.name}
                  </Text>
                  <Text className="text-sm text-muted">
                    {rental.property?.address_line1}, {rental.property?.city}
                  </Text>
                </View>
                <StatusPill kind="rental" value={rental.status} />
              </View>

              <View className="flex-row justify-between pt-3 border-t border-border">
                <InfoItem label="Rent" value={formatCurrency(rental.monthly_rent, true) + '/mo'} />
                <InfoItem label="Deposit" value={formatCurrency(rental.security_deposit, true)} />
                <InfoItem label="Due Day" value={`${rental.rent_due_day}th`} />
              </View>
            </Card>

            {/* Current month rent */}
            {currentPayment && (
              <View>
                <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                  This Month
                </Text>
                <RentStatusBadge payment={currentPayment} />
                {currentPayment.status !== 'paid' && (
                  <Button
                    title="Pay Now"
                    onPress={() => router.push('/(tenant)/pay-rent')}
                    fullWidth
                    size="lg"
                    style={{ marginTop: 8 }}
                  />
                )}
              </View>
            )}

            {/* Quick actions */}
            <Text className="text-sm font-semibold text-muted uppercase tracking-wide">
              Quick Actions
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {[
                { label: 'Upload Proof', emoji: '📷', route: '/(tenant)/proof/upload' },
                { label: 'Agreement', emoji: '📄', route: '/(tenant)/agreement' },
                { label: 'Rent History', emoji: '📋', route: '/(tenant)/rent-history' },
                { label: 'Repairs', emoji: '🔧', route: '/(tenant)/repairs' },
              ].map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => router.push(action.route as never)}
                  className="bg-white rounded-2xl p-4 border border-border"
                  style={{ width: '47%', elevation: 2 }}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 28 }} className="mb-1">{action.emoji}</Text>
                  <Text className="text-sm font-medium text-primary">{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Landlord info */}
            {rental.landlord && (
              <Card>
                <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                  Your Landlord
                </Text>
                <View className="flex-row items-center">
                  <Avatar
                    name={rental.landlord.full_name || 'Landlord'}
                    uri={rental.landlord.avatar_url}
                    size={44}
                  />
                  <View className="ml-3">
                    <Text className="text-base font-semibold text-primary">
                      {rental.landlord.full_name || 'Name not set'}
                    </Text>
                    <Text className="text-sm text-muted">
                      {formatPhone(rental.landlord.phone)}
                    </Text>
                  </View>
                </View>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="text-xs text-muted mb-0.5">{label}</Text>
      <Text className="text-sm font-semibold text-primary">{value}</Text>
    </View>
  );
}
