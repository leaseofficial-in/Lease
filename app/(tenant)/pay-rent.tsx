import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Profile, Rental, RentPayment } from '../../types';
import { formatCurrency, formatMonth, monthKey } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Colors, Fonts } from '../../constants/theme';
import { openUPIPayment } from '../../lib/upi';
import { notifyUser } from '../../lib/sendPush';

type Screen = 'options' | 'utr_confirm' | 'cash_form' | 'done';

export default function PayRentScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();

  const [screen, setScreen] = useState<Screen>('options');
  const [utrNumber, setUtrNumber] = useState('');
  const [cashNote, setCashNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const upiLaunched = useRef(false);

  // When the app returns to foreground after UPI was launched, show UTR confirmation
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && upiLaunched.current) {
        upiLaunched.current = false;
        setScreen('utr_confirm');
      }
    });
    return () => sub.remove();
  }, []);

  const { data: rental, isLoading: loadingRental } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select(`*, property:properties(name), landlord:profiles!rentals_landlord_id_fkey(full_name, upi_id)`)
        .eq('tenant_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as (Rental & { landlord: Pick<Profile, 'full_name' | 'upi_id'> }) | null;
    },
    enabled: !!profile?.id,
  });

  const { data: currentPayment, isLoading: loadingPayment, refetch: refetchPayment } = useQuery({
    queryKey: ['current-payment', rental?.id],
    queryFn: async () => {
      const month = monthKey();
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rental!.id)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data as RentPayment | null;
    },
    enabled: !!rental?.id,
  });

  const totalAmount = (currentPayment?.amount ?? rental?.monthly_rent ?? 0)
    + (currentPayment?.late_fee ?? 0);

  const landlordUpiId = rental?.landlord?.upi_id ?? null;
  const landlordName = rental?.landlord?.full_name ?? 'Landlord';

  // Ensure a payment record exists and return its id
  const ensurePaymentRecord = async (): Promise<string> => {
    if (currentPayment?.id) return currentPayment.id;
    const { data, error } = await supabase
      .from('rent_payments')
      .insert({
        rental_id: rental!.id,
        tenant_id: profile!.id,
        amount: rental!.monthly_rent,
        month: monthKey(),
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return data.id;
  };

  const handleUPIPay = async () => {
    if (!rental || !landlordUpiId) return;
    const month = currentPayment?.month ?? monthKey();
    const opened = await openUPIPayment({
      upiId: landlordUpiId,
      payeeName: landlordName,
      amount: totalAmount,
      note: `Rent ${formatMonth(month)} — ${rental.property?.name ?? ''}`.trim(),
    });

    if (!opened) {
      // UPI apps not available (web or no app installed) — fall through to show UPI ID manually
      showToast('Could not open UPI app. Pay manually using the UPI ID below.', 'error');
      return;
    }
    upiLaunched.current = true;
    // AppState listener will move to utr_confirm when user returns
  };

  const handleSubmitUTR = async () => {
    if (!rental || !profile) return;
    setSubmitting(true);
    try {
      const paymentId = await ensurePaymentRecord();
      const { error } = await supabase
        .from('rent_payments')
        .update({
          status: 'pending_verification',
          payment_method: 'upi',
          utr_number: utrNumber.trim() || null,
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['current-payment'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-payments'] }),
      ]);
      void notifyUser({
        recipientId: rental.landlord_id,
        title: 'Rent payment received',
        body: `Your tenant has marked rent as paid via UPI. Please confirm receipt.`,
        type: 'payment_received',
        data: { rental_id: rental.id },
      });
      setScreen('done');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not record payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCash = async () => {
    if (!rental || !profile) return;
    setSubmitting(true);
    try {
      const paymentId = await ensurePaymentRecord();
      const { error } = await supabase
        .from('rent_payments')
        .update({
          status: 'pending_verification',
          payment_method: 'cash',
          payment_note: cashNote.trim() || null,
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['current-payment'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-payments'] }),
      ]);
      void notifyUser({
        recipientId: rental.landlord_id,
        title: 'Rent payment received',
        body: `Your tenant has marked rent as paid in cash. Please confirm receipt.`,
        type: 'payment_received',
        data: { rental_id: rental.id },
      });
      setScreen('done');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not record payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRental || loadingPayment) return <LoadingScreen />;

  const isPaid = currentPayment?.status === 'paid';
  const isPendingVerification = currentPayment?.status === 'pending_verification';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.canvas }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
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
        <View>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>Tenant</Text>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
            Pay Rent
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 }}>
          {/* Amount card */}
          <Card style={{ backgroundColor: Colors.primary, alignItems: 'center', paddingVertical: 28 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 4 }}>
              {currentPayment ? formatMonth(currentPayment.month) : 'Current Month'}
            </Text>
            <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 40 }}>
              {formatCurrency(totalAmount)}
            </Text>
            {(currentPayment?.late_fee ?? 0) > 0 && (
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 }}>
                Includes {formatCurrency(currentPayment!.late_fee)} late fee
              </Text>
            )}
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: Fonts.sans, fontSize: 13, marginTop: 6 }}>
              {rental?.property?.name}
            </Text>
          </Card>

          {/* Paid */}
          {isPaid && (
            <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
              </View>
              <Text style={{ color: Colors.success, fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>Paid</Text>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, marginTop: 4 }}>
                This month's rent has been recorded.
              </Text>
            </Card>
          )}

          {/* Awaiting landlord confirmation */}
          {(isPendingVerification || screen === 'done') && !isPaid && (
            <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.actionSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="time-outline" size={30} color={Colors.action} />
              </View>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>
                Payment submitted
              </Text>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
                Waiting for your landlord to confirm receipt. This usually takes a few hours.
              </Text>
              {currentPayment?.utr_number ? (
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.mono, fontSize: 12, marginTop: 10 }}>
                  UTR: {currentPayment.utr_number}
                </Text>
              ) : null}
            </Card>
          )}

          {/* Options screen */}
          {!isPaid && !isPendingVerification && screen === 'options' && (
            <>
              {landlordUpiId ? (
                <>
                  {/* UPI Pay button */}
                  <TouchableOpacity
                    onPress={handleUPIPay}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: Colors.action,
                      borderRadius: 18,
                      height: 58,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                  >
                    <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 17 }}>
                      Pay {formatCurrency(totalAmount)} via UPI
                    </Text>
                  </TouchableOpacity>

                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, textAlign: 'center', marginTop: -8 }}>
                    Opens Google Pay, PhonePe, Paytm, or any UPI app
                  </Text>

                  {/* UPI ID reference (for manual pay or if intent fails) */}
                  <Card style={{ backgroundColor: Colors.fill }}>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                      Landlord UPI ID
                    </Text>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.mono, fontSize: 15 }}>
                      {landlordUpiId}
                    </Text>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 }}>
                      Use this to pay manually if the button above doesn't open your UPI app
                    </Text>
                  </Card>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: -4 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>or</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                  </View>
                </>
              ) : (
                <Card style={{ backgroundColor: Colors.warningSoft, borderColor: '#F1D39B' }}>
                  <Text style={{ color: Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginBottom: 4 }}>
                    UPI not set up yet
                  </Text>
                  <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                    Ask your landlord to add their UPI ID in Flatvio. Until then, record a cash payment below.
                  </Text>
                </Card>
              )}

              {/* Cash payment */}
              <Button
                title="Record Cash Payment"
                variant="secondary"
                onPress={() => setScreen('cash_form')}
                fullWidth
                size="lg"
              />

              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, textAlign: 'center' }}>
                No transaction fee. Money goes directly to your landlord.
              </Text>
            </>
          )}

          {/* UTR confirmation (after returning from UPI app) */}
          {screen === 'utr_confirm' && (
            <Card>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginBottom: 6 }}>
                Did the payment go through?
              </Text>
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
                Enter the UTR number from your UPI app (optional but helps landlord verify faster).
              </Text>

              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 6 }}>
                UTR / Transaction ID
              </Text>
              <TextInput
                value={utrNumber}
                onChangeText={setUtrNumber}
                placeholder="e.g. 123456789012"
                placeholderTextColor={Colors.muted}
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: 12,
                  padding: 12,
                  fontFamily: Fonts.mono,
                  fontSize: 15,
                  color: Colors.primary,
                  backgroundColor: Colors.fill,
                  marginBottom: 16,
                }}
              />

              <Button
                title="Yes, I've paid"
                onPress={handleSubmitUTR}
                loading={submitting}
                fullWidth
                size="lg"
              />
              <Button
                title="No, go back"
                variant="ghost"
                onPress={() => setScreen('options')}
                disabled={submitting}
                fullWidth
                style={{ marginTop: 8 }}
              />
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Cash payment bottom sheet */}
      <BottomSheet
        visible={screen === 'cash_form'}
        onClose={() => setScreen('options')}
        scrollable
      >
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20, marginBottom: 6 }}>
          Record cash payment
        </Text>
        <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
          {formatCurrency(totalAmount)} paid in cash. Your landlord will confirm receipt.
        </Text>

        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 6 }}>
          Note (optional)
        </Text>
        <TextInput
          value={cashNote}
          onChangeText={setCashNote}
          placeholder="e.g. Handed over on 3rd May at 6pm"
          placeholderTextColor={Colors.muted}
          multiline
          numberOfLines={3}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            padding: 12,
            fontFamily: Fonts.sans,
            fontSize: 14,
            color: Colors.primary,
            backgroundColor: Colors.fill,
            minHeight: 80,
            textAlignVertical: 'top',
            marginBottom: 16,
          }}
        />

        <Button
          title="Submit Cash Payment"
          onPress={handleSubmitCash}
          loading={submitting}
          fullWidth
          size="lg"
        />
      </BottomSheet>
    </SafeAreaView>
  );
}
