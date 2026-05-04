import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Rental } from '../../types';
import { formatDate, formatCurrency } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Cap } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { confirmAction } from '../../lib/confirm';

export default function AgreementScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [signing, setSigning] = useState(false);

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

  if (isLoading) return <LoadingScreen />;
  if (!rental) return null;

  const isSigned = !!rental.agreement_signed_at;

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: Colors.fill,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <View>
          <Cap>Tenant</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
            Rental Agreement
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
      >
        {/* Status banner */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderRadius: 18,
            borderWidth: 1,
            backgroundColor: isSigned ? Colors.successSoft : Colors.warningSoft,
            borderColor: isSigned ? '#A3D9C0' : '#F1D39B',
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isSigned ? Colors.success : Colors.warning,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Ionicons
              name={isSigned ? 'checkmark' : 'alert'}
              size={20}
              color="#fff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
              {isSigned ? 'Agreement Signed' : 'Awaiting Your Signature'}
            </Text>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, marginTop: 2 }}>
              {isSigned
                ? `Signed on ${formatDate(rental.agreement_signed_at!)}`
                : 'Review the terms below and sign to confirm.'}
            </Text>
          </View>
        </View>

        {/* Terms */}
        <Card>
          <Cap style={{ marginBottom: 14 }}>Agreement Summary</Cap>

          <Section title="Property">
            <TermRow label="Name" value={rental.property?.name ?? '—'} />
            <TermRow
              label="Address"
              value={[rental.property?.address_line1, rental.property?.city, rental.property?.state]
                .filter(Boolean).join(', ')}
            />
          </Section>

          <Section title="Parties">
            <TermRow label="Landlord" value={rental.landlord?.full_name ?? '—'} />
            <TermRow label="Tenant" value={profile?.full_name ?? '—'} />
          </Section>

          <Section title="Financial Terms">
            <TermRow label="Monthly Rent" value={formatCurrency(rental.monthly_rent)} />
            <TermRow label="Security Deposit" value={formatCurrency(rental.security_deposit)} />
            <TermRow label="Due Day" value={`${rental.rent_due_day}th of each month`} />
          </Section>

          <Section title="Duration" last>
            <TermRow label="Start Date" value={formatDate(rental.start_date)} />
            {rental.end_date && (
              <TermRow label="End Date" value={formatDate(rental.end_date)} />
            )}
          </Section>
        </Card>

        {rental.agreement_url && (
          <Button
            title="View Full Agreement"
            variant="secondary"
            onPress={() => Linking.openURL(rental.agreement_url!)}
            fullWidth
          />
        )}

        {!isSigned && (
          <Button
            title="Sign Agreement"
            onPress={handleSign}
            loading={signing}
            fullWidth
            size="lg"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={{ paddingBottom: 14, marginBottom: last ? 0 : 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: Colors.border }}>
      <Text style={{ color: Colors.muted, fontFamily: Fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </Text>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, flex: 1, textAlign: 'right', marginLeft: 16 }}>
        {value}
      </Text>
    </View>
  );
}
