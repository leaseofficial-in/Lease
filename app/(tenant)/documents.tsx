import React from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { DepositTransaction, Proof, Rental, RentPayment } from '../../types';
import { formatCurrency, formatDate, formatMonth } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppIcon, type AppIconName } from '../../components/ui/Icon';
import { Cap, Chip, DisplayText } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { isDevAuthUserId } from '../../lib/devAuth';

type DocumentRental = Rental & {
  property?: Rental['property'];
  landlord?: Rental['landlord'];
};

export default function TenantDocumentsScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const {
    data: rental,
    isLoading,
    refetch: refetchRental,
    isRefetching,
  } = useQuery({
    queryKey: ['tenant-documents-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(*)')
        .eq('tenant_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DocumentRental | null;
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ['tenant-document-payments', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('month', { ascending: false });
      if (error) throw error;
      return data as RentPayment[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { data: deposits = [], refetch: refetchDeposits } = useQuery({
    queryKey: ['tenant-document-deposits', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_transactions')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DepositTransaction[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { data: proofs = [], refetch: refetchProofs } = useQuery({
    queryKey: ['tenant-document-proofs', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Proof[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const refreshAll = async () => {
    await Promise.all([
      refetchRental(),
      rental?.id ? refetchPayments() : Promise.resolve(),
      rental?.id ? refetchDeposits() : Promise.resolve(),
      rental?.id ? refetchProofs() : Promise.resolve(),
    ]);
  };

  const paidReceipts = payments.filter((payment) => payment.status === 'paid');
  const pendingReceipts = payments.filter((payment) => payment.status === 'pending_verification');
  const totalDeducted = deposits.filter((item) => item.type === 'deduction').reduce((sum, item) => sum + item.amount, 0);
  const totalRefunded = deposits.filter((item) => item.type === 'refund').reduce((sum, item) => sum + item.amount, 0);
  const depositBalance = (rental?.security_deposit ?? 0) - totalDeducted - totalRefunded;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refreshAll} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Cap>Tenant</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, marginTop: 4 }}>
            Documents
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 16 }}>
          {isLoading ? (
            <Card>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans }}>Loading documents...</Text>
            </Card>
          ) : !rental ? (
            <EmptyState
              title="No documents yet"
              subtitle={isLocalDevUser ? 'Local demo mode skips live document records.' : 'Join a rental to see agreements, receipts, deposit records, and proofs.'}
              icon={<AppIcon name="folder-open-outline" size={48} color={Colors.muted} />}
            />
          ) : (
            <>
              <Card style={{ backgroundColor: Colors.primary }}>
                <Cap style={{ color: 'rgba(255,255,255,0.58)' }}>Document Vault</Cap>
                <DisplayText style={{ color: Colors.surface, fontSize: 34, lineHeight: 36, marginTop: 8 }} numberOfLines={1}>
                  {rental.property?.name ?? 'Rental'}
                </DisplayText>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
                  Agreement, HRA receipts, deposit ledger, and proof records for this rental.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                  <Chip tone="outline" inverse>{paidReceipts.length} receipts</Chip>
                  <Chip tone="outline" inverse>{deposits.length} deposit entries</Chip>
                  <Chip tone="outline" inverse>{proofs.length} proofs</Chip>
                </View>
              </Card>

              <DocumentSection title="Agreement" icon="document-text-outline">
                <DocumentRow
                  title="Leave & License Agreement"
                  subtitle={
                    rental.agreement_signed_at
                      ? `Signed ${formatDate(rental.agreement_signed_at)}`
                      : rental.agreement_url
                      ? 'Generated, awaiting signature'
                      : 'Not generated yet'
                  }
                  status={rental.agreement_signed_at ? 'Signed' : rental.agreement_url ? 'Pending' : 'Missing'}
                  onPress={() => router.push('/(tenant)/agreement')}
                  actionLabel={rental.agreement_url ? 'Open' : 'Review'}
                />
              </DocumentSection>

              <DocumentSection title="HRA Receipts" icon="receipt-outline">
                {paidReceipts.length === 0 && pendingReceipts.length === 0 ? (
                  <EmptyDocumentText text="Receipts will appear after your landlord confirms rent payments." />
                ) : (
                  <>
                    {paidReceipts.map((payment) => (
                      <DocumentRow
                        key={payment.id}
                        title={`${formatMonth(payment.month)} rent receipt`}
                        subtitle={`${formatCurrency(payment.amount)}${payment.paid_at ? ` - Paid ${formatDate(payment.paid_at)}` : ''}`}
                        status="Available"
                        onPress={() => router.push({ pathname: '/receipt/[paymentId]', params: { paymentId: payment.id } })}
                        actionLabel="View"
                      />
                    ))}
                    {pendingReceipts.map((payment) => (
                      <DocumentRow
                        key={payment.id}
                        title={`${formatMonth(payment.month)} receipt`}
                        subtitle="Available after landlord confirmation"
                        status="Pending"
                      />
                    ))}
                  </>
                )}
              </DocumentSection>

              <DocumentSection title="Deposit Records" icon="shield-checkmark-outline">
                <DocumentRow
                  title="Security deposit ledger"
                  subtitle={`${formatCurrency(depositBalance)} balance - ${deposits.length} entries`}
                  status={deposits.length ? 'Updated' : 'No entries'}
                  onPress={() => router.push('/(tenant)/deposit')}
                  actionLabel="Open"
                />
              </DocumentSection>

              <DocumentSection title="Proof Records" icon="camera-outline">
                {proofs.length === 0 ? (
                  <DocumentRow
                    title="Move-in / move-out proof"
                    subtitle="Upload photos when proof is requested"
                    status="Not submitted"
                    onPress={() => router.push('/(tenant)/proof/upload')}
                    actionLabel="Upload"
                  />
                ) : (
                  proofs.map((proof) => (
                    <DocumentRow
                      key={proof.id}
                      title={proof.type === 'move_out' ? 'Move-out proof' : 'Move-in proof'}
                      subtitle={`Submitted ${formatDate(proof.created_at)}`}
                      status={proof.status.replace('_', ' ')}
                      onPress={() => router.push({ pathname: '/(tenant)/proof/upload', params: { type: proof.type } })}
                      actionLabel="Open"
                    />
                  ))
                )}
              </DocumentSection>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DocumentSection({ title, icon, children }: { title: string; icon: AppIconName; children: React.ReactNode }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name={icon} size={17} color={Colors.primary} />
        </View>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>{title}</Text>
      </View>
      <View style={{ gap: 10 }}>{children}</View>
    </Card>
  );
}

function DocumentRow({
  title,
  subtitle,
  status,
  onPress,
  actionLabel,
}: {
  title: string;
  subtitle: string;
  status: string;
  onPress?: () => void;
  actionLabel?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.78}
      style={{
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        padding: 12,
        backgroundColor: Colors.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>{title}</Text>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, marginTop: 3 }}>
            {subtitle}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <StatusLabel label={status} />
          {actionLabel && <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>{actionLabel}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatusLabel({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  const good = normalized.includes('signed') || normalized.includes('available') || normalized.includes('updated') || normalized.includes('approved');
  const warn = normalized.includes('pending') || normalized.includes('missing') || normalized.includes('not');
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: good ? Colors.successSoft : warn ? Colors.warningSoft : Colors.fill,
      }}
    >
      <Text style={{ color: good ? Colors.success : warn ? Colors.warning : Colors.ink2, fontFamily: Fonts.sansSemiBold, fontSize: 10, textTransform: 'capitalize' }}>
        {label}
      </Text>
    </View>
  );
}

function EmptyDocumentText({ text }: { text: string }) {
  return (
    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
      {text}
    </Text>
  );
}
