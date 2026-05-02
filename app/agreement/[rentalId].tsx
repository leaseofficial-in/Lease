import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Rental } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { Colors, Fonts } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Cap, DisplayText } from '../../components/ui/V2';

export default function AgreementDocumentScreen() {
  const router = useRouter();
  const { rentalId } = useLocalSearchParams<{ rentalId: string }>();
  const { profile } = useAuthStore();
  const [documentHtml, setDocumentHtml] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);

  const {
    data: rental,
    isLoading,
    refetch,
    isRefetching,
    error,
  } = useQuery({
    queryKey: ['agreement-document', rentalId, profile?.id],
    queryFn: async () => {
      const { data, error: rentalError } = await supabase
        .from('rentals')
        .select(`*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(*), tenant:profiles!rentals_tenant_id_fkey(*)`)
        .eq('id', rentalId!)
        .or(`landlord_id.eq.${profile!.id},tenant_id.eq.${profile!.id}`)
        .single();

      if (rentalError) throw rentalError;
      return data as Rental;
    },
    enabled: !!rentalId && !!profile?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || !rental?.agreement_url) {
      setDocumentHtml(null);
      return;
    }

    let isMounted = true;
    setDocumentLoading(true);
    fetch(rental.agreement_url, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Agreement document could not be loaded.');
        return response.text();
      })
      .then((html) => {
        if (isMounted) setDocumentHtml(html);
      })
      .catch(() => {
        if (isMounted) setDocumentHtml(null);
      })
      .finally(() => {
        if (isMounted) setDocumentLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [rental?.agreement_url]);

  if (isLoading) return <LoadingScreen message="Opening agreement..." />;

  if (error || !rental) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
        <DocumentHeader title="Agreement" onBack={() => router.back()} />
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, textAlign: 'center' }}>
            Agreement unavailable
          </Text>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: 'center' }}>
            We could not find an agreement connected to your account.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 18 }} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  const signed = !!rental.agreement_signed_at;
  const tenantName = rental.tenant?.full_name || 'Tenant';
  const landlordName = rental.landlord?.full_name || 'Landlord';
  const propertyAddress = [
    rental.property?.address_line1,
    rental.property?.address_line2,
    rental.property?.city,
    rental.property?.state,
    rental.property?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      <DocumentHeader title="Agreement" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
          paddingTop: Platform.OS === 'web' ? 24 : 18,
          paddingBottom: Platform.OS === 'web' ? 28 : 40,
        }}
      >
        {documentHtml ? (
          <View
            style={{
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {React.createElement('iframe', {
              title: 'Rental Agreement',
              srcDoc: documentHtml,
              style: {
                width: '100%',
                height: Platform.OS === 'web' && typeof window !== 'undefined'
                  ? Math.max(860, window.innerHeight - 132)
                  : 860,
                border: 0,
                display: 'block',
                backgroundColor: Colors.surface,
              },
            })}
          </View>
        ) : (
          <View
            style={{
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 8,
              padding: 22,
            }}
          >
            {documentLoading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <ActivityIndicator size="small" color={Colors.action} />
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13 }}>
                  Loading generated document
                </Text>
              </View>
            )}
          <Cap>Flatvio Agreement</Cap>
          <DisplayText style={{ fontSize: 32, lineHeight: 34, marginTop: 8 }}>
            Leave & License Agreement
          </DisplayText>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20, marginTop: 10 }}>
            This agreement records the rental terms accepted by the landlord and tenant for the property listed below.
          </Text>

          <View style={{ marginTop: 18, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <DocumentPill label={signed ? 'Signed' : 'Awaiting signature'} tone={signed ? 'success' : 'warning'} />
            <DocumentPill label={rental.status.replace('_', ' ')} />
          </View>

          <Section title="Property">
            <Value label="Property Name" value={rental.property?.name || 'Not provided'} />
            <Value label="Address" value={propertyAddress || 'Not provided'} />
            <Value label="Property Type" value={rental.property?.property_type || 'Not provided'} />
          </Section>

          <Section title="Parties">
            <Value label="Landlord" value={landlordName} />
            <Value label="Tenant" value={tenantName} />
          </Section>

          <Section title="Commercial Terms">
            <Value label="Monthly Rent" value={formatCurrency(rental.monthly_rent)} />
            <Value label="Security Deposit" value={formatCurrency(rental.security_deposit)} />
            <Value label="Rent Due Date" value={`Day ${rental.rent_due_day} of every month`} />
          </Section>

          <Section title="Term">
            <Value label="Start Date" value={formatDate(rental.start_date)} />
            <Value label="End Date" value={rental.end_date ? formatDate(rental.end_date) : 'Open until updated'} />
          </Section>

          <Section title="Standard Conditions">
            <Clause>Rent is payable monthly on or before the due date stated in this agreement.</Clause>
            <Clause>The security deposit is held against unpaid dues, damages, or other agreed deductions.</Clause>
            <Clause>The tenant is responsible for ordinary care of the property and prompt reporting of repair needs.</Clause>
            <Clause>The landlord is responsible for reviewing rent, deposit, proof, and repair records inside Flatvio.</Clause>
            <Clause>Any change to rent, deposit, or duration must be recorded before the tenant signs this agreement.</Clause>
          </Section>

          <Section title="Signature Status" isLast>
            <Value
              label="Tenant Signature"
              value={signed ? `Signed on ${formatDate(rental.agreement_signed_at!)}` : 'Not signed yet'}
            />
          </Section>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DocumentHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View
      style={{
        height: 60,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.75}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: Colors.fill,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20, lineHeight: 22 }}>
          {'<'}
        </Text>
      </TouchableOpacity>
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17 }}>{title}</Text>
    </View>
  );
}

function Section({
  title,
  children,
  isLast = false,
}: {
  title: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: Colors.borderSoft,
        paddingTop: 18,
        marginTop: 18,
        paddingBottom: isLast ? 0 : 2,
      }}
    >
      <Cap style={{ marginBottom: 10 }}>{title}</Cap>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11, marginBottom: 3 }}>
        {label}
      </Text>
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 }}>
        {value}
      </Text>
    </View>
  );
}

function Clause({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 7 }} />
      <Text style={{ flex: 1, color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 }}>
        {children}
      </Text>
    </View>
  );
}

function DocumentPill({
  label,
  tone,
}: {
  label: string;
  tone?: 'success' | 'warning';
}) {
  const bg = tone === 'success' ? Colors.successSoft : tone === 'warning' ? Colors.warningSoft : Colors.fill;
  const fg = tone === 'success' ? Colors.success : tone === 'warning' ? Colors.warning : Colors.ink2;

  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, minHeight: 28, justifyContent: 'center' }}>
      <Text style={{ color: fg, fontFamily: Fonts.sansSemiBold, fontSize: 12, textTransform: 'capitalize' }}>
        {label}
      </Text>
    </View>
  );
}
