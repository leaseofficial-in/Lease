import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Image,
  Linking,
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
import { canTenantPay, isPaymentSettled, isPaymentPendingVerification } from '../../lib/payments';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Colors, Fonts } from '../../constants/theme';
import { openUPIPayment } from '../../lib/upi';
import { pickPhoto, takePhoto, uploadPaymentProof, revokeWebPhotoUrl } from '../../lib/storage';
import { notifyUser } from '../../lib/sendPush';

type PayMethod = 'upi' | 'bank_transfer' | 'cash' | 'cheque';

const METHODS: {
  id: PayMethod;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  refLabel?: string;
  refPlaceholder?: string;
  keyboardType?: 'default' | 'numeric';
}[] = [
  {
    id: 'upi',
    label: 'UPI',
    icon: 'phone-portrait-outline',
    refLabel: 'UTR / Transaction ID',
    refPlaceholder: '403217xxxxxx',
    keyboardType: 'numeric',
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    icon: 'business-outline',
    refLabel: 'Reference No.',
    refPlaceholder: 'NEFT / IMPS ref',
  },
  {
    id: 'cash',
    label: 'Cash',
    icon: 'cash-outline',
  },
  {
    id: 'cheque',
    label: 'Cheque',
    icon: 'document-text-outline',
    refLabel: 'Cheque No.',
    refPlaceholder: '001234',
  },
];

const METHOD_LABEL: Record<PayMethod, string> = {
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
};

export default function PayRentScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();

  const [showPaySheet, setShowPaySheet] = useState(false);
  const [method, setMethod] = useState<PayMethod>('upi');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [stage, setStage] = useState<null | 'uploading' | 'saving'>(null);

  const upiLaunched = useRef(false);

  // When user returns from UPI app, open the payment sheet pre-filled with UPI
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && upiLaunched.current) {
        upiLaunched.current = false;
        setMethod('upi');
        setShowPaySheet(true);
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

  const { data: currentPayment, isLoading: loadingPayment } = useQuery({
    queryKey: ['current-payment', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rental!.id)
        .eq('month', monthKey())
        .maybeSingle();
      if (error) throw error;
      return data as RentPayment | null;
    },
    enabled: !!rental?.id,
  });

  const totalAmount = (currentPayment?.amount ?? rental?.monthly_rent ?? 0) + (currentPayment?.late_fee ?? 0);
  const landlordUpiId = rental?.landlord?.upi_id ?? null;
  const landlordName = rental?.landlord?.full_name ?? 'Landlord';

  const ensurePaymentRecord = async (): Promise<string> => {
    if (currentPayment?.id) return currentPayment.id;

    const month = monthKey();

    // Try insert; if it conflicts (concurrent call), fall through to fetch.
    const { data: inserted, error: insertError } = await supabase
      .from('rent_payments')
      .insert({ rental_id: rental!.id, tenant_id: profile!.id, amount: rental!.monthly_rent, month, status: 'pending' })
      .select('id')
      .single();

    if (inserted?.id) return inserted.id;

    const isConflict = insertError?.message?.includes('duplicate') || insertError?.message?.includes('unique');
    if (insertError && !isConflict) throw insertError;

    // Conflict — record was created by a concurrent call or the DB trigger.
    const { data: existing, error: fetchError } = await supabase
      .from('rent_payments')
      .select('id')
      .eq('rental_id', rental!.id)
      .eq('month', month)
      .single();
    if (fetchError) throw fetchError;
    return existing.id;
  };

  const handleUPILaunch = async () => {
    if (!rental || !landlordUpiId) return;
    const month = currentPayment?.month ?? monthKey();
    const opened = await openUPIPayment({
      upiId: landlordUpiId,
      payeeName: landlordName,
      amount: totalAmount,
      note: `Rent ${formatMonth(month)} — ${rental.property?.name ?? ''}`.trim(),
    });
    if (!opened) {
      showToast('Could not open UPI app. Pay manually and mark as paid below.', 'error');
      return;
    }
    upiLaunched.current = true;
  };

  const handlePickProof = async (fromCamera: boolean) => {
    const uri = fromCamera ? await takePhoto() : await pickPhoto();
    if (uri) setProofUri(uri);
  };

  const handleSubmit = async () => {
    if (!rental || !profile || stage !== null) return;
    try {
      setStage('saving');
      const paymentId = await ensurePaymentRecord();

      let proofUrl: string | null = null;
      if (proofUri) {
        setStage('uploading');
        const result = await uploadPaymentProof(proofUri, rental.id, paymentId);
        proofUrl = result.publicUrl;
        revokeWebPhotoUrl(proofUri);
        setStage('saving');
      }

      const { error } = await supabase
        .from('rent_payments')
        .update({
          status: 'pending_verification',
          payment_method: method,
          utr_number: reference.trim() || null,
          payment_note: note.trim() || null,
          payment_proof_url: proofUrl,
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      if (error) throw error;

      setShowPaySheet(false);
      setReference('');
      setNote('');
      setProofUri(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['current-payment'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-payments'] }),
      ]);
      void notifyUser({
        recipientId: rental.landlord_id,
        title: 'Rent payment submitted',
        body: `${profile.full_name ?? 'Your tenant'} marked rent paid via ${METHOD_LABEL[method]}. Please confirm.`,
        type: 'payment_received',
        data: { rental_id: rental.id },
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not record payment', 'error');
    } finally {
      setStage(null);
    }
  };

  const openSheet = (preMethod?: PayMethod) => {
    if (preMethod) setMethod(preMethod);
    setShowPaySheet(true);
  };

  if (loadingRental || loadingPayment) return <LoadingScreen />;

  const isPaid = isPaymentSettled(currentPayment);
  const isPending = isPaymentPendingVerification(currentPayment);
  const canPay = canTenantPay(currentPayment);
  const methodConfig = METHODS.find((m) => m.id === method)!;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.canvas }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', marginRight: 12 }} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <View>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>Tenant</Text>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>Pay Rent</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 }}>

          {/* ── Amount hero ── */}
          <View style={{ backgroundColor: Colors.primary, borderRadius: 20, padding: 28, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 6 }}>
              {currentPayment ? formatMonth(currentPayment.month) : 'Current Month'}
            </Text>
            <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 44, letterSpacing: -1 }}>
              {formatCurrency(totalAmount)}
            </Text>
            {(currentPayment?.late_fee ?? 0) > 0 && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.sans, fontSize: 12 }}>
                  Includes {formatCurrency(currentPayment!.late_fee)} late fee
                </Text>
              </View>
            )}
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: Fonts.sans, fontSize: 13, marginTop: 8 }}>
              {rental?.property?.name}
            </Text>
          </View>

          {/* ── Paid ── */}
          {isPaid && (
            <View style={{ backgroundColor: Colors.successSoft, borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="checkmark" size={28} color="#fff" />
              </View>
              <Text style={{ color: Colors.success, fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>Paid</Text>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, marginTop: 4 }}>
                This month's rent is confirmed.
              </Text>
              {currentPayment?.payment_method && (
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 }}>
                  Paid via {METHOD_LABEL[currentPayment.payment_method as PayMethod] ?? currentPayment.payment_method}
                </Text>
              )}
            </View>
          )}

          {/* ── Pending verification ── */}
          {isPending && (
            <View style={{ backgroundColor: Colors.actionSoft, borderRadius: 18, padding: 24, borderWidth: 1, borderColor: '#C7D7FF' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.action, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="time-outline" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>Awaiting confirmation</Text>
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 }}>Your landlord will confirm shortly</Text>
                </View>
              </View>

              {/* Method + reference row */}
              <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 12, gap: 8 }}>
                {currentPayment?.payment_method && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, width: 90 }}>Method</Text>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, flex: 1 }}>
                      {METHOD_LABEL[currentPayment.payment_method as PayMethod] ?? currentPayment.payment_method}
                    </Text>
                  </View>
                )}
                {currentPayment?.utr_number && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, width: 90 }}>Reference</Text>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.mono, fontSize: 13, flex: 1 }}>{currentPayment.utr_number}</Text>
                  </View>
                )}
                {currentPayment?.payment_note && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, width: 90 }}>Note</Text>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sans, fontSize: 13, flex: 1 }}>{currentPayment.payment_note}</Text>
                  </View>
                )}
                {currentPayment?.payment_proof_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(currentPayment.payment_proof_url!)} activeOpacity={0.85}>
                    <Image
                      source={{ uri: currentPayment.payment_proof_url }}
                      style={{ width: '100%', height: 160, borderRadius: 10, marginTop: 4 }}
                      resizeMode="cover"
                    />
                    <Text style={{ color: Colors.action, fontFamily: Fonts.sansMedium, fontSize: 12, marginTop: 4 }}>
                      Tap to view full receipt
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* ── Payment options ── */}
          {canPay && (
            <>
              {landlordUpiId ? (
                <>
                  {/* UPI launch button */}
                  <TouchableOpacity
                    onPress={handleUPILaunch}
                    activeOpacity={0.85}
                    style={{ backgroundColor: Colors.action, borderRadius: 18, height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                  >
                    <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 17 }}>
                      Pay {formatCurrency(totalAmount)} via UPI
                    </Text>
                  </TouchableOpacity>

                  {/* UPI ID reference */}
                  <View style={{ backgroundColor: Colors.fill, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="qr-code-outline" size={20} color={Colors.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Landlord UPI ID</Text>
                      <Text style={{ color: Colors.primary, fontFamily: Fonts.mono, fontSize: 14, marginTop: 2 }}>{landlordUpiId}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>or</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                  </View>
                </>
              ) : (
                <View style={{ backgroundColor: Colors.warningSoft, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F1D39B' }}>
                  <Text style={{ color: Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginBottom: 4 }}>UPI not set up yet</Text>
                  <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                    Ask your landlord to add their UPI ID. Until then, mark your payment manually below.
                  </Text>
                </View>
              )}

              <Button title="Mark as Paid" onPress={() => openSheet()} fullWidth size="lg" />

              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, textAlign: 'center', marginTop: -8 }}>
                No transaction fees — money goes directly to your landlord
              </Text>
            </>
          )}

        </View>
      </ScrollView>

      {/* ── Payment form sheet ── */}
      <BottomSheet visible={showPaySheet} onClose={() => setShowPaySheet(false)} scrollable>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20, marginBottom: 2 }}>
          How did you pay?
        </Text>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, marginBottom: 20 }}>
          {formatCurrency(totalAmount)} · {currentPayment ? formatMonth(currentPayment.month) : 'Current Month'}
        </Text>

        {/* Method chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {METHODS.map((m) => {
            const active = method === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => { setMethod(m.id); setReference(''); }}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: active ? Colors.action : Colors.border,
                  backgroundColor: active ? Colors.actionSoft : Colors.fill,
                }}
              >
                <Ionicons name={m.icon} size={16} color={active ? Colors.action : Colors.muted} />
                <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 14, color: active ? Colors.action : Colors.primary }}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reference field (conditional) */}
        {methodConfig.refLabel && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 6 }}>
              {methodConfig.refLabel}
              <Text style={{ color: Colors.muted }}> (optional)</Text>
            </Text>
            <TextInput
              value={reference}
              onChangeText={setReference}
              placeholder={methodConfig.refPlaceholder}
              placeholderTextColor={Colors.muted}
              keyboardType={methodConfig.keyboardType ?? 'default'}
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: Fonts.mono, fontSize: 15, color: Colors.primary, backgroundColor: Colors.fill }}
            />
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11, marginTop: 4 }}>
              Helps your landlord verify faster
            </Text>
          </View>
        )}

        {/* Note */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 6 }}>
            Note <Text style={{ color: Colors.muted }}>(optional)</Text>
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Paid on 3rd May at 6pm"
            placeholderTextColor={Colors.muted}
            multiline
            numberOfLines={3}
            style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: Fonts.sans, fontSize: 14, color: Colors.primary, backgroundColor: Colors.fill, minHeight: 76, textAlignVertical: 'top' }}
          />
        </View>

        {/* Receipt upload */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 10 }}>
            Attach receipt / screenshot <Text style={{ color: Colors.muted }}>(optional)</Text>
          </Text>

          {proofUri ? (
            <View style={{ position: 'relative' }}>
              <Image source={{ uri: proofUri }} style={{ width: '100%', height: 180, borderRadius: 14 }} resizeMode="cover" />
              <TouchableOpacity
                onPress={() => { revokeWebPhotoUrl(proofUri); setProofUri(null); }}
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  onPress={() => handlePickProof(true)}
                  activeOpacity={0.8}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14 }}
                >
                  <Ionicons name="camera-outline" size={20} color={Colors.muted} />
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 14 }}>Camera</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => handlePickProof(false)}
                activeOpacity={0.8}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14 }}
              >
                <Ionicons name="images-outline" size={20} color={Colors.muted} />
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 14 }}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Button
          title={`Submit as ${METHOD_LABEL[method]}`}
          loadingText={stage === 'uploading' ? 'Uploading…' : 'Saving…'}
          onPress={handleSubmit}
          loading={stage !== null}
          disabled={stage !== null}
          fullWidth
          size="lg"
        />
      </BottomSheet>
    </SafeAreaView>
  );
}
