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
import { AppIcon } from '../../../components/ui/Icon';
import { RentStatusBadge } from '../../../components/rental/RentStatusBadge';
import { DepositCard } from '../../../components/rental/DepositCard';
import { ActivityFeed } from '../../../components/rental/ActivityFeed';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import { Cap, Chip, InkCard } from '../../../components/ui/V2';
import { Colors, Fonts } from '../../../constants/theme';
import { Config } from '../../../constants/config';
import { isDevAuthUserId } from '../../../lib/devAuth';
import { activateLocalRental, archiveLocalProperty, listLocalRentalsByPropertyId, restoreLocalProperty, updateLocalRentalTerms } from '../../../lib/localRentals';
import { confirmAction } from '../../../lib/confirm';
import { buildRentalActivity } from '../../../lib/rentalActivity';
import { generateRentalAgreement } from '../../../lib/agreement';
import { confirmRentPayment } from '../../../lib/payments';
import { notifyUser } from '../../../lib/sendPush';

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
  const [archivingPlace, setArchivingPlace] = useState(false);
  const [termsForm, setTermsForm] = useState({
    monthlyRent: '',
    securityDeposit: '',
    rentDueDay: '',
    startDate: '',
    endDate: '',
    noticePeriodDays: '30',
    furnishedStatus: 'unfurnished',
    lateFeePercent: '5',
    maintenanceCharges: '0',
  });
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: allPropertyRentals, isLoading, refetch: refetchRental, isRefetching: isRentalRefetching } = useQuery({
    queryKey: ['rental-by-property', propertyId],
    queryFn: async () => {
      if (isLocalDevUser) {
        return listLocalRentalsByPropertyId(propertyId);
      }
      const { data, error } = await supabase
        .from('rentals')
        .select(`*, property:properties(*), tenant:profiles!rentals_tenant_id_fkey(*)`)
        .eq('property_id', propertyId)
        .eq('landlord_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Rental[];
    },
    enabled: !!propertyId && !!profile?.id,
  });

  // Current = first non-ended rental; fallback to most recent ended
  const rental = allPropertyRentals?.find((r) => r.status !== 'ended') ?? allPropertyRentals?.[0];
  const rentalHistory = allPropertyRentals?.filter((r) => r.id !== rental?.id) ?? [];

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
  const blockingArchiveRental = allPropertyRentals?.find((item) =>
    item.status === 'active' || item.status === 'pending_proof' || item.status === 'pending_moveout',
  );
  const isArchivedPlace = !!rental?.property?.archived_at;
  const canArchivePlace = !!rental && !blockingArchiveRental;

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
      noticePeriodDays: String(rental.notice_period_days ?? 30),
      furnishedStatus: rental.furnished_status ?? 'unfurnished',
      lateFeePercent: String(rental.late_fee_percent ?? 5),
      maintenanceCharges: String(rental.maintenance_charges ?? 0),
    });
    setShowTermsSheet(true);
  };

  const doSaveTerms = async () => {
    if (!rental) return;

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
      notice_period_days: Number(termsForm.noticePeriodDays) || 30,
      furnished_status: (termsForm.furnishedStatus || 'unfurnished') as 'furnished' | 'semi_furnished' | 'unfurnished',
      late_fee_percent: Number(termsForm.lateFeePercent) || 5,
      maintenance_charges: Number(termsForm.maintenanceCharges) || 0,
    };
    try {
      if (isLocalDevUser) {
        await updateLocalRentalTerms(rental.id, payload);
      } else {
        const { error } = await supabase
          .from('rentals')
          .update({ ...payload, agreement_signed_at: null, updated_at: new Date().toISOString() })
          .eq('id', rental.id)
          .select('id')
          .single();
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
      await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
      setShowTermsSheet(false);

      // Auto-regenerate agreement if one already exists
      if (!isLocalDevUser && rental.agreement_url) {
        showToast('Terms updated · Regenerating agreement…', 'success');
        try {
          await generateRentalAgreement(rental.id);
          await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
          await queryClient.invalidateQueries({ queryKey: ['agreement-document', rental.id] });
          showToast('Agreement regenerated with new terms', 'success');
        } catch {
          showToast('Terms saved · Please regenerate the agreement manually', 'error');
        }
      } else {
        showToast('Rental terms updated', 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update terms', 'error');
    } finally {
      setSavingTerms(false);
    }
  };

  const handleSaveTerms = async () => {
    if (!rental) return;
    if (rental.agreement_signed_at) {
      confirmAction(
        'Edit Signed Agreement?',
        'The tenant has already signed this agreement. Editing terms will void the signature and generate a new agreement for re-signing.',
        doSaveTerms,
        'Edit & Regenerate',
      );
      return;
    }
    await doSaveTerms();
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
          if (rental.tenant_id) {
            void notifyUser({
              recipientId: rental.tenant_id,
              title: 'Move-out started',
              body: `Your landlord has started the move-out process for ${rental.property?.name ?? 'your property'}. Please upload your move-out photos.`,
              type: 'general',
              data: { rental_id: rental.id },
            });
          }
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

  const handleArchivePlace = () => {
    if (!rental || !profile) return;

    if (isArchivedPlace) {
      confirmAction(
        'Restore Place',
        'This will move the place back into your current portfolio filters.',
        async () => {
          setArchivingPlace(true);
          try {
            if (isLocalDevUser) {
              await restoreLocalProperty(rental.property_id);
            } else {
              const { error } = await supabase
                .from('properties')
                .update({ archived_at: null })
                .eq('id', rental.property_id)
                .eq('landlord_id', profile.id);
              if (error) throw error;
            }

            await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
            await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
            showToast('Place restored', 'success');
          } catch (error) {
            showToast(error instanceof Error ? error.message : 'Failed to restore place', 'error');
          } finally {
            setArchivingPlace(false);
          }
        },
        'Restore',
      );
      return;
    }

    if (!canArchivePlace) {
      showToast('Close active or tenant-joined rentals before archiving this place.', 'error');
      return;
    }

    const placeName = rental.property?.name ?? 'this place';
    const rentalCount = allPropertyRentals?.length ?? 1;
    confirmAction(
      'Archive Place',
      `This hides ${placeName} from your current portfolio while keeping ${rentalCount} linked rental record${rentalCount === 1 ? '' : 's'}, receipts, agreements, and history available.`,
      async () => {
        setArchivingPlace(true);
        try {
          if (isLocalDevUser) {
            await archiveLocalProperty(rental.property_id);
          } else {
            const { error } = await supabase
              .from('properties')
              .update({ archived_at: new Date().toISOString() })
              .eq('id', rental.property_id)
              .eq('landlord_id', profile.id);
            if (error) throw error;
          }

          await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
          await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });
          showToast('Place archived', 'success');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to archive place', 'error');
        } finally {
          setArchivingPlace(false);
        }
      },
      'Archive',
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
          {isArchivedPlace ? <Chip tone="outline">Archived</Chip> : <StatusPill kind="rental" value={rental.status} />}
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
              {isArchivedPlace && <Chip tone="outline" inverse>Archived</Chip>}
              <Chip tone={rental.status === 'active' ? 'good' : 'warn'}>
                {rental.status === 'active' ? 'Active rental' : 'Setup pending'}
              </Chip>
              <Chip tone="outline" inverse>{rental.property?.property_type ?? 'property'}</Chip>
            </View>
          </InkCard>

          {(() => {
            if (!rental.end_date) return null;
            const daysLeft = Math.ceil((new Date(rental.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysLeft > 60) return null;
            const expired = daysLeft <= 0;
            return (
              <View
                style={{
                  backgroundColor: expired ? '#FEF2F2' : Colors.warningSoft,
                  borderColor: expired ? '#F5B8B5' : '#F1D39B',
                  borderWidth: 1, borderRadius: 16, padding: 14,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={expired ? Colors.danger : Colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: expired ? Colors.danger : Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
                    {expired ? 'Lease has expired' : `Lease ending in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                  </Text>
                  <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 }}>
                    End date: {new Date(rental.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            );
          })()}

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
                  onPress={() => router.push({ pathname: '/(landlord)/proof/[rentalId]', params: { rentalId: rental.id, type: 'move_out' } })}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
                </View>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>Rental Terms</Text>
              </View>
              <TouchableOpacity
                onPress={openTermsEditor}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7,
                  borderRadius: 20, borderWidth: 1.5,
                  borderColor: Colors.action,
                  backgroundColor: Colors.actionSoft,
                }}
              >
                <Ionicons name="pencil-outline" size={13} color={Colors.action} />
                <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>Edit Terms</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              <TermRow label="Monthly Rent" value={formatCurrency(rental.monthly_rent)} />
              {(rental.maintenance_charges ?? 0) > 0 && (
                <TermRow label="Maintenance" value={`${formatCurrency(rental.maintenance_charges)} / month`} />
              )}
              <TermRow label="Security Deposit" value={formatCurrency(rental.security_deposit)} />
              <TermRow label="Due Day" value={`${rental.rent_due_day}${ordinal(rental.rent_due_day)} of each month`} />
              <TermRow label="Late Fee" value={`${rental.late_fee_percent ?? 5}%`} />
              <TermRow label="Start Date" value={formatDate(rental.start_date)} />
              {rental.end_date && <TermRow label="End Date" value={formatDate(rental.end_date)} />}
              <TermRow label="Notice Period" value={`${rental.notice_period_days ?? 30} days`} />
              <TermRow
                label="Furnished"
                value={
                  rental.furnished_status === 'furnished'
                    ? 'Fully Furnished'
                    : rental.furnished_status === 'semi_furnished'
                    ? 'Semi-Furnished'
                    : 'Unfurnished'
                }
              />
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
                              void notifyUser({
                                recipientId: p.tenant_id,
                                title: 'Payment confirmed',
                                body: `Your landlord confirmed receipt of your rent payment for ${rental.property?.name ?? 'your property'}.`,
                                type: 'payment_received',
                                data: { rental_id: rental.id },
                              });
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

          {rental.status === 'ended' && (
            <Card style={{ backgroundColor: Colors.fill, borderStyle: 'dashed' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Ionicons name="add-circle-outline" size={20} color={Colors.action} />
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
                  This rental has ended
                </Text>
              </View>
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
                Start a new rental for this property with a new tenant and fresh terms.
              </Text>
              <Button
                title="New Rental on This Property"
                onPress={() => router.push({ pathname: '/(landlord)/create-rental', params: { propertyId: rental.property_id } })}
                fullWidth
              />
            </Card>
          )}

          {rentalHistory.length > 0 && (
            <Card>
              <Cap style={{ marginBottom: 12 }}>Rental History</Cap>
              <View style={{ gap: 0 }}>
                {rentalHistory.map((past, i) => (
                  <View
                    key={past.id}
                    style={{
                      paddingVertical: 12,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: Colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>
                        {past.tenant?.full_name ?? 'No tenant'}
                      </Text>
                      <StatusPill kind="rental" value={past.status} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
                        {formatDate(past.start_date)}{past.end_date ? ` → ${formatDate(past.end_date)}` : ''}
                      </Text>
                      <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                        {formatCurrency(past.monthly_rent, true)}/mo
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          )}

          <Card style={{ borderColor: isArchivedPlace ? Colors.border : canArchivePlace ? '#F5B8B5' : Colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  backgroundColor: isArchivedPlace ? Colors.fill : canArchivePlace ? Colors.dangerSoft : Colors.fill,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppIcon
                  name={isArchivedPlace ? 'archive-outline' : canArchivePlace ? 'archive-outline' : 'lock-closed-outline'}
                  size={18}
                  color={isArchivedPlace ? Colors.muted : canArchivePlace ? Colors.danger : Colors.muted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Cap>Portfolio Status</Cap>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15, marginTop: 4 }}>
                  {isArchivedPlace ? 'Archived place' : 'Archive this place'}
                </Text>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
                  {isArchivedPlace
                    ? 'This place is hidden from the current portfolio. Restore it whenever you need it active again.'
                    : canArchivePlace
                    ? 'Hide this property from current views while keeping receipts, agreements, and history intact.'
                    : 'Close active, move-out, or tenant-joined rentals before archiving this place.'}
                </Text>
              </View>
            </View>
            <Button
              title={isArchivedPlace ? 'Restore Place' : 'Archive Place'}
              variant={isArchivedPlace ? 'secondary' : 'danger'}
              onPress={handleArchivePlace}
              loading={archivingPlace}
              disabled={!isArchivedPlace && !canArchivePlace}
              fullWidth
            />
          </Card>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: Colors.actionSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="pencil-outline" size={17} color={Colors.action} />
          </View>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20 }}>Edit Rental Terms</Text>
        </View>
        <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
          {rental?.agreement_signed_at
            ? 'Editing will void the tenant\'s signature and regenerate the agreement for re-signing.'
            : rental?.agreement_url
            ? 'Saving will automatically regenerate the agreement document.'
            : 'These terms will be used when you generate the rental agreement.'}
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
          hint="Move-out / lease end date"
        />
        <Input
          label="Notice Period (days)"
          placeholder="30"
          value={termsForm.noticePeriodDays}
          onChangeText={(value) => setTermsForm((current) => ({ ...current, noticePeriodDays: value }))}
          keyboardType="numeric"
          hint="30 or 60 days is standard"
        />
        <Input
          label="Late Fee (%)"
          placeholder="5"
          value={termsForm.lateFeePercent}
          onChangeText={(value) => setTermsForm((current) => ({ ...current, lateFeePercent: value }))}
          keyboardType="numeric"
        />
        <Input
          label="Maintenance Charges"
          placeholder="0"
          value={termsForm.maintenanceCharges}
          onChangeText={(value) => setTermsForm((current) => ({ ...current, maintenanceCharges: value }))}
          keyboardType="numeric"
          hint="Monthly society / utility charges"
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
