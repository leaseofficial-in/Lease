import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { DepositTransaction, Proof, Rental, RentPayment, RepairRequest } from '../../../types';
import { formatCurrency, formatDate, formatPhone } from '../../../lib/formatters';
import { Card } from '../../../components/ui/Card';
import { StatusPill } from '../../../components/ui/StatusPill';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { RentStatusBadge } from '../../../components/rental/RentStatusBadge';
import { DepositCard } from '../../../components/rental/DepositCard';
import { ActivityFeed } from '../../../components/rental/ActivityFeed';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import { Cap, Chip, InkCard } from '../../../components/ui/V2';
import { Colors, Fonts } from '../../../constants/theme';
import { Config } from '../../../constants/config';
import { isDevAuthUserId } from '../../../lib/devAuth';
import { activateLocalRental, getLocalRentalByPropertyId, updateLocalRentalTerms } from '../../../lib/localRentals';
import { confirmAction } from '../../../lib/confirm';
import { buildRentalActivity } from '../../../lib/rentalActivity';
import { generateRentalAgreement } from '../../../lib/agreement';
import { confirmRentPayment } from '../../../lib/payments';

type TxnType = 'deduction' | 'refund' | 'received';

export default function PropertyDetailScreen() {
  const { id: propertyId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [activatingRental, setActivatingRental] = useState(false);
  const [showDepositSheet, setShowDepositSheet] = useState(false);
  const [txnType, setTxnType] = useState<TxnType>('deduction');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnNote, setTxnNote] = useState('');
  const [savingTxn, setSavingTxn] = useState(false);
  const [localDepositTransactions, setLocalDepositTransactions] = useState<DepositTransaction[]>([]);
  const [showTermsSheet, setShowTermsSheet] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [generatingAgreement, setGeneratingAgreement] = useState(false);
  const [initiatingMoveout, setInitiatingMoveout] = useState(false);
  const [closingRental, setClosingRental] = useState(false);
  const [termsForm, setTermsForm] = useState({
    monthlyRent: '',
    securityDeposit: '',
    rentDueDay: '',
    startDate: '',
    endDate: '',
  });
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: rental, isLoading, refetch: refetchRental, isRefetching: isRentalRefetching } = useQuery({
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

  const { data: payments, refetch: refetchPayments } = useQuery({
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

  const { data: depositTransactions, refetch: refetchDeposit } = useQuery({
    queryKey: ['deposit-transactions', rental?.id],
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

  const { data: repairs, refetch: refetchRepairs } = useQuery({
    queryKey: ['repairs', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as RepairRequest[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { data: proofs, refetch: refetchProofs } = useQuery({
    queryKey: ['proofs-by-rental', rental?.id],
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

  const visibleDepositTransactions = isLocalDevUser ? localDepositTransactions : depositTransactions ?? [];

  const refreshAll = async () => {
    await Promise.all([
      refetchRental(),
      !isLocalDevUser && rental?.id ? refetchPayments() : Promise.resolve(),
      !isLocalDevUser && rental?.id ? refetchDeposit() : Promise.resolve(),
      !isLocalDevUser && rental?.id ? refetchRepairs() : Promise.resolve(),
      !isLocalDevUser && rental?.id ? refetchProofs() : Promise.resolve(),
    ]);
  };

  const resetTransactionForm = () => {
    setTxnAmount('');
    setTxnNote('');
    setTxnType('deduction');
  };

  const handleAddTransaction = async () => {
    if (!rental || !profile) return;
    const amount = Number(txnAmount);
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    if (!txnNote.trim()) {
      showToast('Add a note describing this transaction', 'error');
      return;
    }

    setSavingTxn(true);
    try {
      if (isLocalDevUser) {
        const now = new Date().toISOString();
        setLocalDepositTransactions((current) => [
          {
            id: `local-deposit-${Date.now()}`,
            rental_id: rental.id,
            type: txnType,
            amount,
            note: txnNote.trim(),
            created_by: profile.id,
            created_at: now,
          },
          ...current,
        ]);
      } else {
        const { error } = await supabase.from('deposit_transactions').insert({
          rental_id: rental.id,
          type: txnType,
          amount,
          note: txnNote.trim(),
          created_by: profile.id,
        });
        if (error) throw error;
        await refetchDeposit();
      }

      setShowDepositSheet(false);
      resetTransactionForm();
      showToast('Transaction added', 'success');
    } catch {
      showToast('Failed to save transaction', 'error');
    } finally {
      setSavingTxn(false);
    }
  };

  const appOrigin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : Config.publicAppUrl;
  const webInviteLink = `${appOrigin}/join/${rental?.invite_token}`;

  const handleCopyInvite = async () => {
    await Clipboard.setStringAsync(webInviteLink);
    showToast('Invite link copied', 'success');
  };

  const handleShareInvite = async () => {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: 'Join my rental on Flatvio',
            text: "Hi, I've added you as a tenant on Flatvio.",
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
      message: `Hi, I've added you as a tenant on Flatvio. Join here: ${webInviteLink}`,
      url: webInviteLink,
    });
  };

  const openTermsEditor = () => {
    if (!rental) return;
    setTermsForm({
      monthlyRent: String(rental.monthly_rent ?? ''),
      securityDeposit: String(rental.security_deposit ?? ''),
      rentDueDay: String(rental.rent_due_day ?? ''),
      startDate: rental.start_date ?? '',
      endDate: rental.end_date ?? '',
    });
    setShowTermsSheet(true);
  };

  const handleSaveTerms = async () => {
    if (!rental) return;
    if (rental.agreement_signed_at) {
      showToast('Agreement is already signed. Terms are locked.', 'error');
      return;
    }

    const monthlyRent = Number(termsForm.monthlyRent);
    const securityDeposit = Number(termsForm.securityDeposit);
    const rentDueDay = Number(termsForm.rentDueDay);

    if (!monthlyRent || monthlyRent <= 0) {
      showToast('Enter a valid monthly rent', 'error');
      return;
    }
    if (Number.isNaN(securityDeposit) || securityDeposit < 0) {
      showToast('Enter a valid security deposit', 'error');
      return;
    }
    if (!Number.isInteger(rentDueDay) || rentDueDay < 1 || rentDueDay > 31) {
      showToast('Rent due day must be between 1 and 31', 'error');
      return;
    }
    if (!termsForm.startDate.trim()) {
      showToast('Start date is required', 'error');
      return;
    }

    setSavingTerms(true);
    const payload = {
      monthly_rent: monthlyRent,
      security_deposit: securityDeposit,
      rent_due_day: rentDueDay,
      start_date: termsForm.startDate.trim(),
      end_date: termsForm.endDate.trim() || null,
    };
    try {
      if (isLocalDevUser) {
        await updateLocalRentalTerms(rental.id, payload);
      } else {
        const { error } = await supabase
          .from('rentals')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', rental.id)
          .is('agreement_signed_at', null)
          .select('id')
          .single();
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
      await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
      setShowTermsSheet(false);
      showToast('Agreement terms updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update terms', 'error');
    } finally {
      setSavingTerms(false);
    }
  };

  const handleActivateRental = async () => {
    if (!rental) return;
    confirmAction(
      'Activate Rental',
      'Once activated, rent payments will be tracked from this month. Continue?',
      async () => {
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
          showToast('Rental activated', 'success');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to activate rental', 'error');
        } finally {
          setActivatingRental(false);
        }
      },
      'Activate',
    );
  };

  const handleInitiateMoveout = () => {
    if (!rental) return;
    confirmAction(
      'Initiate Move-out',
      'This will notify the tenant to upload move-out photos. The rental status will change to "Move-out". Continue?',
      async () => {
        setInitiatingMoveout(true);
        try {
          const { error } = await supabase
            .from('rentals')
            .update({ status: 'pending_moveout', updated_at: new Date().toISOString() })
            .eq('id', rental.id);
          if (error) throw error;
          await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
          await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
          showToast('Move-out initiated. Tenant will be notified.', 'success');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to initiate move-out', 'error');
        } finally {
          setInitiatingMoveout(false);
        }
      },
      'Initiate',
    );
  };

  const handleCloseRental = () => {
    if (!rental) return;
    confirmAction(
      'Close Rental',
      'This will end the rental permanently. Make sure deposit settlement is complete. This cannot be undone.',
      async () => {
        setClosingRental(true);
        try {
          const { error } = await supabase
            .from('rentals')
            .update({ status: 'ended', updated_at: new Date().toISOString() })
            .eq('id', rental.id);
          if (error) throw error;
          await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
          await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
          showToast('Rental closed.', 'success');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to close rental', 'error');
        } finally {
          setClosingRental(false);
        }
      },
      'Close Rental',
      true,
    );
  };

  const openAgreementDocument = () => {
    if (!rental) return;
    router.push({
      pathname: '/agreement/[rentalId]',
      params: { rentalId: rental.id },
    });
  };

  if (isLoading) return <LoadingScreen />;
  if (!rental) return null;
  const activity = buildRentalActivity({
    rental,
    payments: payments ?? [],
    repairs: repairs ?? [],
    proofs: proofs ?? [],
    deposits: visibleDepositTransactions,
  });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={isRentalRefetching} onRefresh={refreshAll} />}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 20, paddingVertical: 12,
            backgroundColor: Colors.surface,
            borderBottomWidth: 1, borderBottomColor: Colors.border,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17 }}>
              {rental.property?.name}
            </Text>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12 }}>
              {rental.property?.city}, {rental.property?.state}
            </Text>
          </View>
          <StatusPill kind="rental" value={rental.status} />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 14 }}>
          <InkCard>
            <Cap style={{ color: 'rgba(255,255,255,0.58)' }}>Property Ledger</Cap>
            <Text style={{ color: Colors.surface, fontFamily: Fonts.serif, fontSize: 38, lineHeight: 39, marginTop: 8 }}>
              {formatCurrency(rental.monthly_rent, true)}
              <Text style={{ fontFamily: Fonts.sans, fontSize: 15 }}> / month</Text>
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.68)', fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
              Deposit held: {formatCurrency(rental.security_deposit, true)}. Rent due on day {rental.rent_due_day}.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
              <Chip tone={rental.status === 'active' ? 'good' : 'warn'}>
                {rental.status === 'active' ? 'Active rental' : 'Setup pending'}
              </Chip>
              <Chip tone="outline" inverse>{rental.property?.property_type ?? 'property'}</Chip>
            </View>
          </InkCard>

          {rental.status === 'pending_tenant' && (
            <Card>
              <Cap style={{ marginBottom: 10 }}>Invite Tenant</Cap>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
                Share this private join link
              </Text>
              <View style={{ backgroundColor: Colors.fill, borderRadius: 14, padding: 12, marginVertical: 12 }}>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.mono, fontSize: 11 }} numberOfLines={1}>
                  {webInviteLink}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="Copy Link" variant="secondary" onPress={handleCopyInvite} style={{ flex: 1 }} />
                <Button title="Share" onPress={handleShareInvite} style={{ flex: 1 }} />
              </View>
            </Card>
          )}

          {rental.status === 'pending_proof' && (
            <Card style={{ backgroundColor: Colors.warningSoft, borderColor: '#F1D39B' }}>
              <Text style={{ color: Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
                Tenant joined, proof pending
              </Text>
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 12 }}>
                Ask your tenant to upload move-in photos, then activate the rental.
              </Text>
              <Button title="Activate Rental" onPress={handleActivateRental} loading={activatingRental} fullWidth />
            </Card>
          )}

          {rental.status === 'pending_moveout' && (
            <Card style={{ backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Ionicons name="exit-outline" size={20} color="#7C3AED" />
                <Text style={{ color: '#7C3AED', fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
                  Move-out in progress
                </Text>
              </View>
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
                Tenant needs to upload move-out photos. Review them, then settle the deposit and close the rental.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  title="Review Photos"
                  onPress={() => router.push(`/(landlord)/proof/${rental.id}`)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Close Rental"
                  variant="danger"
                  onPress={handleCloseRental}
                  loading={closingRental}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {rental.tenant && (
            <Card>
              <Cap style={{ marginBottom: 12 }}>Tenant</Cap>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar name={rental.tenant.full_name || 'Tenant'} uri={rental.tenant.avatar_url} size={48} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
                    {rental.tenant.full_name || 'Name not set'}
                  </Text>
                  <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, marginTop: 2 }}>
                    {formatPhone(rental.tenant.phone)}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          <DepositCard
            totalDeposit={rental.security_deposit}
            transactions={visibleDepositTransactions}
          />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Add Deposit Entry"
              onPress={() => setShowDepositSheet(true)}
              style={{ flex: 1 }}
            />
            <Button
              title="Repairs"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/(landlord)/repairs/[rentalId]',
                  params: { rentalId: rental.id },
                })
              }
              style={{ flex: 1 }}
            />
          </View>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Cap>Rental Terms</Cap>
              {!rental.agreement_signed_at && (
                <TouchableOpacity onPress={openTermsEditor} activeOpacity={0.75}>
                  <Cap style={{ color: Colors.primary }}>Edit</Cap>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ gap: 10 }}>
              <TermRow label="Monthly Rent" value={formatCurrency(rental.monthly_rent)} />
              <TermRow label="Security Deposit" value={formatCurrency(rental.security_deposit)} />
              <TermRow label="Due Day" value={`${rental.rent_due_day}${ordinal(rental.rent_due_day)} of each month`} />
              <TermRow label="Start Date" value={formatDate(rental.start_date)} />
              {rental.end_date && <TermRow label="End Date" value={formatDate(rental.end_date)} />}
              <TermRow
                label="Agreement"
                value={rental.agreement_signed_at ? `Signed ${formatDate(rental.agreement_signed_at)}` : 'Editable before tenant signs'}
              />
            </View>
          </Card>

          {/* Agreement */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Cap>Agreement</Cap>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 4 }}>
                  Leave & License
                </Text>
              </View>
              {rental.agreement_signed_at ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: Colors.successSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                    <Text style={{ color: Colors.success, fontFamily: Fonts.sansSemiBold, fontSize: 11 }}>Signed</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {rental.agreement_url ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                  {rental.agreement_signed_at
                    ? `Tenant signed on ${formatDate(rental.agreement_signed_at)}.`
                    : 'Agreement generated. Waiting for tenant to sign.'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Button
                    title="View Agreement"
                    variant="secondary"
                    size="sm"
                    onPress={openAgreementDocument}
                    style={{ flex: 1 }}
                  />
                  {!rental.agreement_signed_at && (
                    <Button
                      title="Regenerate"
                      variant="ghost"
                      size="sm"
                      loading={generatingAgreement}
                      onPress={async () => {
                        setGeneratingAgreement(true);
                        try {
                          await generateRentalAgreement(rental.id);
                          await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
                          await queryClient.invalidateQueries({ queryKey: ['agreement-document', rental.id] });
                          showToast('Agreement regenerated', 'success');
                        } catch (error) {
                          showToast(error instanceof Error ? error.message : 'Could not generate agreement', 'error');
                        } finally {
                          setGeneratingAgreement(false);
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </View>
            ) : (
              <View>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
                  Generate a Leave & License agreement with all rental terms, legal clauses, and signature blocks. Share it with your tenant.
                </Text>
                <Button
                  title="Generate Agreement"
                  loading={generatingAgreement}
                  onPress={async () => {
                    setGeneratingAgreement(true);
                    try {
                      await generateRentalAgreement(rental.id);
                      await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
                      await queryClient.invalidateQueries({ queryKey: ['agreement-document', rental.id] });
                      showToast('Agreement ready', 'success');
                      openAgreementDocument();
                    } catch (error) {
                      showToast(error instanceof Error ? error.message : 'Could not generate agreement', 'error');
                    } finally {
                      setGeneratingAgreement(false);
                    }
                  }}
                  fullWidth
                />
              </View>
            )}
          </Card>

          {payments && payments.length > 0 && (
            <Card>
              <Cap style={{ marginBottom: 12 }}>Recent Payments</Cap>
              <View style={{ gap: 12 }}>
                {payments.map((p) => (
                  <View key={p.id}>
                    <RentStatusBadge payment={p} />
                    {p.status === 'pending_verification' && (
                      <View
                        style={{
                          marginTop: 8,
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: Colors.actionSoft,
                          borderWidth: 1,
                          borderColor: '#C7D7FF',
                        }}
                      >
                        <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 13, marginBottom: 2 }}>
                          Tenant says they paid {p.payment_method === 'cash' ? 'cash' : 'via UPI'}
                        </Text>
                        {p.utr_number ? (
                          <Text style={{ color: Colors.ink3, fontFamily: Fonts.mono, fontSize: 12, marginBottom: 8 }}>
                            UTR: {p.utr_number}
                          </Text>
                        ) : null}
                        {p.payment_note ? (
                          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, marginBottom: 8 }}>
                            Note: {p.payment_note}
                          </Text>
                        ) : null}
                        <Button
                          title="Confirm Receipt"
                          size="sm"
                          onPress={async () => {
                            try {
                              await confirmRentPayment(p.id);
                              await Promise.all([
                                refetchPayments(),
                                queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] }),
                                queryClient.invalidateQueries({ queryKey: ['landlord-payment-actions'] }),
                              ]);
                              showToast('Payment confirmed', 'success');
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : 'Could not confirm payment', 'error');
                            }
                          }}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </Card>
          )}

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Cap>Timeline</Cap>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11 }}>
                {activity.length} events
              </Text>
            </View>
            <ActivityFeed items={activity} limit={8} />
          </Card>

          {(rental.status === 'active' || rental.status === 'pending_proof') && (
            <Button
              title="Review Move-in Proof"
              variant="secondary"
              onPress={() => router.push(`/(landlord)/proof/${rental.id}`)}
              fullWidth
            />
          )}

          {rental.status === 'active' && (
            <Button
              title="Initiate Move-out"
              variant="ghost"
              onPress={handleInitiateMoveout}
              loading={initiatingMoveout}
              fullWidth
            />
          )}
        </View>
      </ScrollView>

      <BottomSheet visible={showDepositSheet} onClose={() => setShowDepositSheet(false)} scrollable>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20, marginBottom: 14 }}>
          Add deposit entry
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['deduction', 'refund', 'received'] as TxnType[]).map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setTxnType(type)}
              style={{
                borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5,
                backgroundColor: txnType === type ? Colors.primary : Colors.surface,
                borderColor: txnType === type ? Colors.primary : Colors.border,
              }}
              activeOpacity={0.75}
            >
              <Text
                style={{
                  color: txnType === type ? Colors.surface : Colors.primary,
                  fontFamily: Fonts.sansSemiBold,
                  fontSize: 12,
                  textTransform: 'capitalize',
                }}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Amount"
          placeholder="2500"
          value={txnAmount}
          onChangeText={setTxnAmount}
          keyboardType="numeric"
          required
        />

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>
            Note <Text style={{ color: Colors.danger }}>*</Text>
          </Text>
          <TextInput
            value={txnNote}
            onChangeText={setTxnNote}
            placeholder="Cleaning deduction, refund issued, deposit received..."
            placeholderTextColor={Colors.muted}
            multiline
            numberOfLines={4}
            style={{
              borderWidth: 1, borderColor: Colors.border, borderRadius: 14,
              padding: 12, minHeight: 96, textAlignVertical: 'top',
              fontFamily: Fonts.sans, fontSize: 14, color: Colors.primary,
              backgroundColor: Colors.fill,
            }}
          />
        </View>

        <Button
          title="Save Entry"
          onPress={handleAddTransaction}
          loading={savingTxn}
          fullWidth
          size="lg"
        />
      </BottomSheet>

      <BottomSheet visible={showTermsSheet} onClose={() => setShowTermsSheet(false)} scrollable>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20, marginBottom: 6 }}>
          Edit agreement terms
        </Text>
        <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
          These values update the tenant agreement summary until the tenant signs it.
        </Text>

        <Input
          label="Monthly Rent"
          placeholder="25000"
          value={termsForm.monthlyRent}
          onChangeText={(value) => setTermsForm((current) => ({ ...current, monthlyRent: value }))}
          keyboardType="numeric"
          required
        />
        <Input
          label="Security Deposit"
          placeholder="50000"
          value={termsForm.securityDeposit}
          onChangeText={(value) => setTermsForm((current) => ({ ...current, securityDeposit: value }))}
          keyboardType="numeric"
          required
        />
        <Input
          label="Rent Due Day"
          placeholder="5"
          value={termsForm.rentDueDay}
          onChangeText={(value) => setTermsForm((current) => ({ ...current, rentDueDay: value }))}
          keyboardType="numeric"
          required
        />
        <Input
          label="Start Date"
          placeholder="YYYY-MM-DD"
          value={termsForm.startDate}
          onChangeText={(value) => setTermsForm((current) => ({ ...current, startDate: value }))}
          required
        />
        <Input
          label="End Date"
          placeholder="YYYY-MM-DD (optional)"
          value={termsForm.endDate}
          onChangeText={(value) => setTermsForm((current) => ({ ...current, endDate: value }))}
        />

        <Button
          title="Save Terms"
          onPress={handleSaveTerms}
          loading={savingTerms}
          fullWidth
          size="lg"
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, textAlign: 'right', flex: 1, marginLeft: 16 }}>{value}</Text>
    </View>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
