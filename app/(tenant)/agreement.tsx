import React, { useState } from 'react';
import { View, Text, ScrollView, Linking, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Rental } from '../../types';
import { formatDate, formatCurrency } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { confirmAction } from '../../lib/confirm';
import { generateRentalAgreement } from '../../lib/agreement';

export default function AgreementScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [signing, setSigning] = useState(false);
  const [openingAgreement, setOpeningAgreement] = useState(false);

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
    enabled: !!profile?.id,
  });

  const signAgreement = async () => {
    if (!rental) return;
    setSigning(true);
    try {
      const { error } = await supabase
        .from('rentals')
        .update({ agreement_signed_at: new Date().toISOString() })
        .eq('id', rental.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['tenant-rental'] });
      showToast('Agreement signed!', 'success');
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to sign agreement', 'error');
    } finally {
      setSigning(false);
    }
  };

  const handleSign = () => {
    confirmAction(
      'Sign Agreement',
      'By signing, you confirm you have read and agree to the rental terms listed below.',
      signAgreement,
      'Sign',
    );
  };

  const openFullAgreement = async () => {
    if (!rental) return;
    setOpeningAgreement(true);
    try {
      const { agreementUrl } = await generateRentalAgreement(rental.id);
      await queryClient.invalidateQueries({ queryKey: ['tenant-rental'] });
      Linking.openURL(agreementUrl);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not open agreement', 'error');
    } finally {
      setOpeningAgreement(false);
    }
  };

  if (isLoading) return <LoadingScreen />;
  if (!rental) return null;

  const isSigned = !!rental.agreement_signed_at;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View className="px-5 py-4 flex-row items-center bg-white border-b border-border">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <Text className="text-primary">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-primary">Rental Agreement</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-5 pt-4 pb-8 gap-4">
          {/* Status banner */}
          {isSigned ? (
            <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex-row items-center">
              <Text style={{ fontSize: 24 }} className="mr-3">✅</Text>
              <View>
                <Text className="text-sm font-semibold text-success">Agreement Signed</Text>
                <Text className="text-xs text-muted">
                  Signed on {formatDate(rental.agreement_signed_at!)}
                </Text>
              </View>
            </View>
          ) : (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Text className="text-sm font-semibold text-warning mb-1">Awaiting Your Signature</Text>
              <Text className="text-xs text-muted">
                Review the terms below and sign to confirm your rental agreement.
              </Text>
            </View>
          )}

          {/* Agreement terms card */}
          <Card>
            <Text className="text-base font-bold text-primary mb-4">
              RENTAL AGREEMENT SUMMARY
            </Text>
            <View className="gap-3">
              <Section title="Property">
                <Text className="text-sm text-primary">{rental.property?.name}</Text>
                <Text className="text-sm text-muted">
                  {rental.property?.address_line1}
                  {rental.property?.address_line2 ? `, ${rental.property.address_line2}` : ''}
                </Text>
                <Text className="text-sm text-muted">
                  {rental.property?.city}, {rental.property?.state} — {rental.property?.pincode}
                </Text>
              </Section>

              <Section title="Parties">
                <TermRow label="Landlord" value={rental.landlord?.full_name ?? '—'} />
                <TermRow label="Tenant" value={profile?.full_name ?? '—'} />
              </Section>

              <Section title="Financial Terms">
                <TermRow label="Monthly Rent" value={formatCurrency(rental.monthly_rent)} />
                <TermRow label="Security Deposit" value={formatCurrency(rental.security_deposit)} />
                <TermRow label="Rent Due Day" value={`${rental.rent_due_day}th of each month`} />
              </Section>

              <Section title="Duration">
                <TermRow label="Start Date" value={formatDate(rental.start_date)} />
                {rental.end_date && (
                  <TermRow label="End Date" value={formatDate(rental.end_date)} />
                )}
              </Section>
            </View>
          </Card>

          {/* External agreement link if available */}
          {rental.agreement_url && (
            <Button
              title="View Full Agreement"
              variant="secondary"
              onPress={openFullAgreement}
              loading={openingAgreement}
              fullWidth
            />
          )}

          {!isSigned && (
            <Button title="Sign Agreement" onPress={handleSign} loading={signing} fullWidth size="lg" />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="border-b border-border pb-3">
      <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{title}</Text>
      <View className="gap-1">{children}</View>
    </View>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-medium text-primary">{value}</Text>
    </View>
  );
}
