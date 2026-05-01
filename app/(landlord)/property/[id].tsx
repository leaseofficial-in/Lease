import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { Rental, RentPayment } from '../../../types';
import { formatCurrency, formatDate, formatPhone } from '../../../lib/formatters';
import { Card } from '../../../components/ui/Card';
import { StatusPill } from '../../../components/ui/StatusPill';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { RentStatusBadge } from '../../../components/rental/RentStatusBadge';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import { Config } from '../../../constants/config';
import { isDevAuthUserId } from '../../../lib/devAuth';
import { activateLocalRental, getLocalRentalByPropertyId } from '../../../lib/localRentals';

export default function PropertyDetailScreen() {
  const { id: propertyId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [activatingRental, setActivatingRental] = useState(false);
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: rental, isLoading } = useQuery({
    queryKey: ['rental-by-property', propertyId],
    queryFn: async () => {
      if (isLocalDevUser) {
        const localRental = await getLocalRentalByPropertyId(propertyId, profile!.id);
        if (!localRental) throw new Error('Local rental not found');
        return localRental;
      }

      const { data, error } = await supabase
        .from('rentals')
        .select(`*, property:properties(*), tenant:profiles!rentals_tenant_id_fkey(*)`)
        .eq('property_id', propertyId)
        .eq('landlord_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data as Rental;
    },
    enabled: !!propertyId && !!profile?.id,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments-by-rental', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('month', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as RentPayment[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const inviteLink = `${Config.appScheme}://join/${rental?.invite_token}`;
  const webInviteLink = `https://flatvio.in/join/${rental?.invite_token}`;

  const handleCopyInvite = async () => {
    await Clipboard.setStringAsync(webInviteLink);
    showToast('Invite link copied!', 'success');
  };

  const handleShareInvite = async () => {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: 'Join my rental on Flatvio',
            text: `Hi! I've added you as a tenant on Flatvio.`,
            url: webInviteLink,
          });
        } catch {
          handleCopyInvite();
        }
      } else {
        handleCopyInvite();
      }
      return;
    }
    await Share.share({
      message: `Hi! I've added you as a tenant on Flatvio. Join here: ${webInviteLink}`,
      url: webInviteLink,
    });
  };

  const handleActivateRental = async () => {
    if (!rental) return;
    Alert.alert(
      'Activate Rental',
      'Once activated, rent payments will be tracked from this month. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            setActivatingRental(true);
            try {
              if (isLocalDevUser) {
                await activateLocalRental(rental.id);
                await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
                await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
                showToast('Rental activated locally.', 'success');
                return;
              }

              const { error } = await supabase
                .from('rentals')
                .update({ status: 'active' })
                .eq('id', rental.id);
              if (error) throw error;
              await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
              await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
              showToast('Rental activated!', 'success');
            } catch (e) {
              showToast('Failed to activate rental', 'error');
            } finally {
              setActivatingRental(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading) return <LoadingScreen />;
  if (!rental) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 py-4 flex-row items-center bg-white border-b border-border">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
          >
            <Text className="text-primary">←</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-primary" numberOfLines={1}>
              {rental.property?.name}
            </Text>
            <Text className="text-xs text-muted">
              {rental.property?.city}, {rental.property?.state}
            </Text>
          </View>
          <StatusPill kind="rental" value={rental.status} />
        </View>

        <View className="px-5 pt-4 pb-8 gap-4">
          {/* Invite section (shown when tenant hasn't joined) */}
          {rental.status === 'pending_tenant' && (
            <Card>
              <View className="flex-row items-center mb-3">
                <Text style={{ fontSize: 24 }} className="mr-2">🔗</Text>
                <View>
                  <Text className="text-base font-semibold text-primary">Invite Tenant</Text>
                  <Text className="text-xs text-muted">Share link to invite your tenant</Text>
                </View>
              </View>
              <View className="bg-gray-50 rounded-xl p-3 mb-3">
                <Text className="text-xs text-muted font-mono" numberOfLines={1}>
                  {webInviteLink}
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Button
                  title="Copy Link"
                  variant="secondary"
                  onPress={handleCopyInvite}
                  style={{ flex: 1 }}
                />
                <Button title="Share" onPress={handleShareInvite} style={{ flex: 1 }} />
              </View>
            </Card>
          )}

          {/* Activate rental (tenant joined, not yet active) */}
          {rental.status === 'pending_proof' && (
            <Card className="bg-amber-50 border border-amber-200">
              <Text className="text-sm font-semibold text-warning mb-1">
                Tenant joined — pending proof
              </Text>
              <Text className="text-xs text-muted mb-3">
                Ask your tenant to upload move-in photos, then activate the rental.
              </Text>
              <Button
                title="Activate Rental"
                onPress={handleActivateRental}
                loading={activatingRental}
                fullWidth
              />
            </Card>
          )}

          {/* Tenant card */}
          {rental.tenant && (
            <Card>
              <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                Tenant
              </Text>
              <View className="flex-row items-center">
                <Avatar
                  name={rental.tenant.full_name || 'Tenant'}
                  uri={rental.tenant.avatar_url}
                  size={48}
                />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-primary">
                    {rental.tenant.full_name || 'Name not set'}
                  </Text>
                  <Text className="text-sm text-muted">{formatPhone(rental.tenant.phone)}</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Rental terms */}
          <Card>
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              Rental Terms
            </Text>
            <View className="gap-2.5">
              <TermRow label="Monthly Rent" value={formatCurrency(rental.monthly_rent)} />
              <TermRow label="Security Deposit" value={formatCurrency(rental.security_deposit)} />
              <TermRow label="Due Day" value={`${rental.rent_due_day}${ordinal(rental.rent_due_day)} of each month`} />
              <TermRow label="Start Date" value={formatDate(rental.start_date)} />
              {rental.end_date && <TermRow label="End Date" value={formatDate(rental.end_date)} />}
            </View>
          </Card>

          {/* Recent payments */}
          {payments && payments.length > 0 && (
            <Card>
              <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                Recent Payments
              </Text>
              <View className="gap-2">
                {payments.map((p) => (
                  <RentStatusBadge key={p.id} payment={p} />
                ))}
              </View>
            </Card>
          )}

          {/* Proof review */}
          {(rental.status === 'active' || rental.status === 'pending_proof') && (
            <Button
              title="Review Move-in Proof"
              variant="secondary"
              onPress={() => router.push(`/(landlord)/proof/${rental.id}`)}
              fullWidth
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-medium text-primary">{value}</Text>
    </View>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
