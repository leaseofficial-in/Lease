import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Rental } from '../../types';
import { formatDate, formatCurrency } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppIcon, BackButton } from '../../components/ui/Icon';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Cap } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { confirmAction } from '../../lib/confirm';
import { generateRentalAgreement, loadRentalAgreementHtml } from '../../lib/agreement';

export default function AgreementScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [signing, setSigning] = useState(false);
  const [openingDoc, setOpeningDoc] = useState(false);

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
      try {
        await generateRentalAgreement(rental.id);
      } catch {
        // The signature is saved even if document refresh is temporarily unavailable.
      }
      await queryClient.invalidateQueries({ queryKey: ['tenant-rental'] });
      await queryClient.invalidateQueries({ queryKey: ['agreement-document', rental.id] });
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

  const openAgreement = async () => {
    if (!rental) return;

    if (Platform.OS === 'web') {
      router.push({ pathname: '/agreement/[rentalId]', params: { rentalId: rental.id } });
      return;
    }

    setOpeningDoc(true);
    try {
      const result = await loadRentalAgreementHtml(rental.id, rental.agreement_url);
      if (result.refreshed) {
        await queryClient.invalidateQueries({ queryKey: ['tenant-rental'] });
        await queryClient.invalidateQueries({ queryKey: ['agreement-document', rental.id] });
      }

      const { uri } = await Print.printToFileAsync({ html: result.html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Rental Agreement',
          UTI: 'com.adobe.pdf',
        });
      } else {
        showToast('Sharing is not available on this device', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not open agreement', 'error');
    } finally {
      setOpeningDoc(false);
    }
  };

  if (isLoading) return <LoadingScreen />;
  if (!rental) {
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
          <BackButton onPress={() => router.back()} style={{ marginRight: 12 }} />
          <View>
            <Cap>Tenant</Cap>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
              Rental Agreement
            </Text>
          </View>
        </View>
        <EmptyState
          title="No active rental"
          subtitle="Join a rental before viewing or signing an agreement."
          actionLabel="Go Home"
          onAction={() => router.replace('/(tenant)')}
          icon={<AppIcon name="document-text-outline" size={42} color={Colors.muted} />}
        />
      </SafeAreaView>
    );
  }

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
        <BackButton onPress={() => router.back()} style={{ marginRight: 12 }} />
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
            <AppIcon
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
            <TermRow label="Name" value={rental.property?.name ?? '-'} />
            <TermRow
              label="Address"
              value={[rental.property?.address_line1, rental.property?.city, rental.property?.state]
                .filter(Boolean).join(', ')}
            />
          </Section>

          <Section title="Parties">
            <TermRow label="Landlord" value={rental.landlord?.full_name ?? '-'} />
            <TermRow label="Tenant" value={profile?.full_name ?? '-'} />
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

        <Button
          title={openingDoc ? 'Preparing...' : 'View / Download Agreement'}
          variant="secondary"
          loading={openingDoc}
          onPress={openAgreement}
          fullWidth
        />

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
