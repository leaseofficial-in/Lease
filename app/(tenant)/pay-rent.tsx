import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  AppStateStatus,
  Easing,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Svg, Circle as SvgCircle, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useRegion } from '../../stores/regionStore';
import { Profile, Rental, RentPayment } from '../../types';
import { formatCurrency, formatMonth, monthKey } from '../../lib/formatters';
import { canTenantPay, isPaymentSettled, isPaymentPendingVerification } from '../../lib/payments';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Colors, Fonts, Shadow } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';
import { openUPIPayment } from '../../lib/upi';
import { pickPhoto, takePhoto, uploadPaymentProof, revokeWebPhotoUrl } from '../../lib/storage';
import { notifyUser } from '../../lib/sendPush';
import { writeRentalEvent } from '../../lib/events';
import { sendEmail } from '../../lib/email';
import { PaymentMethodId, PAYMENT_METHOD_DISPLAY, UPI_APPS, UpiAppId } from '../../lib/i18n/payments';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stepper({ step, dark = false }: { step: number; dark?: boolean }) {
  const active   = dark ? '#F6F4EE'                : Colors.action;
  const inactive = dark ? 'rgba(246,244,238,0.18)' : Colors.fill2;
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 22, marginTop: 4 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i <= step ? active : inactive }} />
      ))}
    </View>
  );
}

function WaxSeal() {
  const r = 29;
  const dots = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return { cx: 40 + Math.cos(a) * r, cy: 40 + Math.sin(a) * r };
  });
  return (
    <Svg viewBox="0 0 80 80" width={70} height={70}>
      <Defs>
        <RadialGradient id="wxG" cx="50%" cy="40%" r="60%">
          <Stop offset="0%"   stopColor="#E89B5C" />
          <Stop offset="60%"  stopColor="#C97A3A" />
          <Stop offset="100%" stopColor="#7a4a1f" />
        </RadialGradient>
      </Defs>
      {dots.map((d, i) => <SvgCircle key={i} cx={d.cx} cy={d.cy} r={3} fill="url(#wxG)" />)}
      <SvgCircle cx={40} cy={40} r={26} fill="url(#wxG)" />
      <SvgText x="40" y="36" textAnchor="middle" fill="#fff" fontSize={5} letterSpacing={1.5} fontWeight="700">PAID</SvgText>
      <SvgText x="40" y="49" textAnchor="middle" fill="#fff" fontSize={10}>SEALED</SvgText>
    </Svg>
  );
}

function SpinningRing({ amount }: { amount: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    anim.start();
    return () => anim.stop();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const R = 76; const C = 2 * Math.PI * R; const filled = C * 0.67;
  return (
    <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={180} height={180} style={{ position: 'absolute' }}>
        <SvgCircle cx={90} cy={90} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={14} />
      </Svg>
      <Animated.View style={{ position: 'absolute', width: 180, height: 180, transform: [{ rotate }] }}>
        <Svg width={180} height={180}>
          <SvgCircle cx={90} cy={90} r={R} fill="none" stroke={Colors.accent} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${filled} ${C}`} transform="rotate(-90 90 90)" />
        </Svg>
      </Animated.View>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: '#F6F4EE', fontFamily: Fonts.serif, fontSize: 30, letterSpacing: -1 }}>{formatCurrency(amount)}</Text>
        <Text style={{ color: 'rgba(246,244,238,0.5)', fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.8, marginTop: 4, textTransform: 'uppercase' }}>Waiting · Payment</Text>
      </View>
    </View>
  );
}

function BurstRays({ anim }: { anim: Animated.Value }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      {Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2 - Math.PI / 2;
        const tx = Math.cos(angle) * 56; const ty = Math.sin(angle) * 56;
        return (
          <Animated.View key={i} style={{
            position: 'absolute', width: 2, height: 16, borderRadius: 1, backgroundColor: Colors.accent,
            opacity: anim.interpolate({ inputRange: [0, 0.25, 0.8, 1], outputRange: [0, 0.9, 0.55, 0] }),
            transform: [
              { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
              { rotate: `${(i / 14) * 360}deg` },
            ],
          }} />
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PayRentScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const region = useRegion();

  const isIndia = region.countryCode === 'IN';
  const availableMethods = region.paymentMethods;

  // For UPI-style instant-app flow, the first UPI method triggers it
  const hasInstantApp = isIndia && availableMethods.includes('upi');

  const [payStep, setPayStep]          = useState<0 | 1 | 2>(0);
  const [selectedUpiApp, setSelectedUpiApp] = useState<UpiAppId>('phonepe');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>(availableMethods[0] ?? 'bank_transfer');
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [reference, setReference]      = useState('');
  const [note, setNote]                = useState('');
  const [proofUri, setProofUri]        = useState<string | null>(null);
  const [stage, setStage]              = useState<null | 'uploading' | 'saving'>(null);
  const [paidTime, setPaidTime]        = useState<Date | null>(null);

  const upiLaunched = useRef(false);
  const submitRef   = useRef<(m?: PaymentMethodId) => Promise<void>>(async () => {});
  const burstAnim   = useRef(new Animated.Value(0)).current;

  // AppState: user returns from UPI app
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && upiLaunched.current) {
        upiLaunched.current = false;
        setPaidTime(new Date());
        setPayStep(2);
        void submitRef.current('upi');
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (payStep === 2) {
      burstAnim.setValue(0);
      Animated.spring(burstAnim, { toValue: 1, tension: 45, friction: 7, useNativeDriver: true }).start();
    }
  }, [payStep]);

  // ── Queries ──────────────────────────────────────────────────────────────────

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

  // ── Derived ───────────────────────────────────────────────────────────────────

  const baseRent      = currentPayment?.amount ?? rental?.monthly_rent ?? 0;
  const lateFee       = currentPayment?.late_fee ?? 0;
  const totalAmount   = baseRent + lateFee;
  const landlordUpiId = rental?.landlord?.upi_id ?? null;
  const landlordName  = rental?.landlord?.full_name ?? 'Landlord';
  const receiptMonth  = currentPayment ? formatMonth(currentPayment.month) : formatMonth(monthKey());

  const receiptNum = useMemo(() => {
    if (!currentPayment?.month) return '—';
    const [y, m] = currentPayment.month.split('-');
    const n = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
    return `#${y}-${m}-${n}`;
  }, [currentPayment?.month]);

  const methodLookup = PAYMENT_METHOD_DISPLAY as Record<string, typeof PAYMENT_METHOD_DISPLAY[keyof typeof PAYMENT_METHOD_DISPLAY]>;
  const activeMethodDisplay = methodLookup[selectedMethod];

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const ensurePaymentRecord = async (): Promise<string> => {
    if (currentPayment?.id) return currentPayment.id;
    const mo = monthKey();
    const { data: inserted, error: insertError } = await supabase
      .from('rent_payments')
      .insert({ rental_id: rental!.id, tenant_id: profile!.id, amount: rental!.monthly_rent, month: mo, status: 'pending' })
      .select('id')
      .single();
    if (inserted?.id) return inserted.id;
    const isConflict = insertError?.message?.includes('duplicate') || insertError?.message?.includes('unique');
    if (insertError && !isConflict) throw insertError;
    const { data: existing, error: fetchError } = await supabase
      .from('rent_payments').select('id').eq('rental_id', rental!.id).eq('month', mo).single();
    if (fetchError) throw fetchError;
    return existing.id;
  };

  const handleSubmit = async (overrideMethod?: PaymentMethodId) => {
    if (!rental || !profile || stage !== null) return;
    const payMethod = overrideMethod ?? selectedMethod;
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
      const { error } = await supabase.from('rent_payments').update({
        status: 'pending_verification',
        payment_method: payMethod,
        utr_number: reference.trim() || null,
        payment_note: note.trim() || null,
        payment_proof_url: proofUrl,
        paid_at: new Date().toISOString(),
      }).eq('id', paymentId);
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['current-payment'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-payments'] }),
      ]);
      void writeRentalEvent({
        rentalId: rental.id, actorType: 'tenant', actorId: profile.id,
        eventType: 'rent_payment_submitted',
        payload: { payment_id: paymentId, method: payMethod, month: currentPayment?.month ?? monthKey(), amount: totalAmount, has_proof: !!proofUrl },
        idempotencyKey: `rent_submitted_${paymentId}`,
      });
      sendEmail({
        type: 'rent_submitted', recipientId: rental.landlord_id, referenceId: paymentId,
        variables: {
          tenantName: profile.full_name || 'Your tenant',
          propertyName: rental.property?.name ?? 'your property',
          month: formatMonth(currentPayment?.month ?? monthKey()),
          amount: String(totalAmount),
          method: methodLookup[payMethod]?.label ?? payMethod,
        },
      });
      void notifyUser({
        recipientId: rental.landlord_id, title: 'Rent payment submitted',
        body: `${profile.full_name ?? 'Your tenant'} marked rent paid via ${methodLookup[payMethod]?.label ?? payMethod}. Please confirm.`,
        type: 'payment_received', data: { rental_id: rental.id },
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not record payment', 'error');
    } finally {
      setStage(null);
    }
  };

  submitRef.current = handleSubmit;

  const handleUPILaunch = async () => {
    if (!rental || !landlordUpiId) {
      showToast('Landlord has no UPI ID set up. Use bank transfer instead.', 'error');
      setShowTransferSheet(true);
      return;
    }
    const mo = currentPayment?.month ?? monthKey();
    const opened = await openUPIPayment({
      upiId: landlordUpiId, payeeName: landlordName, amount: totalAmount,
      note: `Rent ${formatMonth(mo)} — ${rental.property?.name ?? ''}`.trim(),
    });
    if (!opened) {
      showToast('Could not open UPI app. Use bank transfer instead.', 'error');
      return;
    }
    upiLaunched.current = true;
    setPayStep(1);
  };

  const handlePrimaryPay = () => {
    if (selectedMethod === 'upi' && hasInstantApp) {
      void handleUPILaunch();
    } else {
      setShowTransferSheet(true);
    }
  };

  const handleTransferSubmit = async () => {
    setShowTransferSheet(false);
    setPaidTime(new Date());
    setPayStep(2);
    await handleSubmit(selectedMethod);
  };

  const handlePickProof = async (fromCamera: boolean) => {
    const uri = fromCamera ? await takePhoto() : await pickPhoto();
    if (uri) setProofUri(uri);
  };

  // ── Early returns ─────────────────────────────────────────────────────────────

  if (loadingRental || loadingPayment) return <LoadingScreen />;

  const isPaid    = isPaymentSettled(currentPayment);
  const isPending = isPaymentPendingVerification(currentPayment);
  const canPay    = canTenantPay(currentPayment);

  const now = paidTime ?? new Date();
  const paidDateStr = now.toLocaleDateString(region.locale, { day: '2-digit', month: 'short' });
  const paidTimeStr = now.toLocaleTimeString(region.locale, { hour: '2-digit', minute: '2-digit', hour12: true });
  const paidAtStr = `${paidDateStr} · ${paidTimeStr}`;

  // ── Step 2: Paid / Receipt sealed ────────────────────────────────────────────

  if (payStep === 2) {
    return (
      <DashboardShell role="tenant">
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.canvas }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <TouchableOpacity onPress={() => { setPayStep(0); router.back(); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.75}>
              <Ionicons name="close" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: Colors.action, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                PAID · {paidAtStr.toUpperCase()}
              </Text>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.serif, fontSize: 18, marginTop: 1 }}>Receipt sealed</Text>
            </View>
            <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.75}>
              <Ionicons name="download-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
            <Stepper step={2} />

            <View style={{ alignItems: 'center', marginBottom: 18, position: 'relative' }}>
              <BurstRays anim={burstAnim} />
              <Text style={{ fontFamily: Fonts.serif, fontSize: 30, letterSpacing: -0.8, color: Colors.primary, textAlign: 'center' }}>
                {'You paid '}
                <Text style={{ color: Colors.accent, fontStyle: 'italic' }}>{formatCurrency(totalAmount)}.</Text>
              </Text>
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                {landlordName} got it. The ledger is sealed.
              </Text>
            </View>

            {/* Receipt card */}
            <View style={{ backgroundColor: '#FBF6EB', borderRadius: 20, padding: 20, ...Shadow.card }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: Colors.primary }}>
                <View>
                  <Text style={{ fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 2, color: Colors.ink3, textTransform: 'uppercase', fontWeight: '700' }}>
                    {region.receiptLabel.toUpperCase()}
                  </Text>
                  <Text style={{ fontFamily: Fonts.serif, fontSize: 22, color: Colors.primary, marginTop: 4 }}>{receiptMonth}</Text>
                </View>
                <View style={{ transform: [{ rotate: '-12deg' }], marginTop: -6, marginRight: -4 }}>
                  <WaxSeal />
                </View>
              </View>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.ink3, marginTop: 10, marginBottom: 12 }}>
                {receiptNum} · {paidAtStr}
              </Text>
              {([
                { label: 'Paid to',  value: landlordName,                    mono: false },
                { label: 'Property', value: rental?.property?.name ?? '—',   mono: false },
                { label: 'Period',   value: receiptMonth,                     mono: false },
                { label: activeMethodDisplay?.referenceLabel ?? 'Ref.',
                  value: reference.trim() || '—', mono: true },
              ] as const).map(({ label, value, mono }) => (
                <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: Colors.ink3 }}>{label}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: mono ? Fonts.mono : Fonts.sansMedium, fontSize: 13, color: Colors.primary, maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.fill2 }}>
                <View>
                  <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 13, color: Colors.primary }}>
                    {region.receiptFootnote ? `${region.receiptLabel} · ${region.receiptFootnote}` : region.receiptLabel}
                  </Text>
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.muted, marginTop: 2 }}>
                    {isIndia ? 'Use this for tax filing' : 'Keep this for your records'}
                  </Text>
                </View>
                <Text style={{ fontFamily: Fonts.serif, fontSize: 22, color: Colors.primary }}>{formatCurrency(totalAmount)}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border }}>
            <TouchableOpacity style={{ flex: 1, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.8}>
              <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 15, color: Colors.primary }}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setPayStep(0); router.back(); }} style={{ flex: 2, height: 52, borderRadius: 16, backgroundColor: Colors.action, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.85}>
              <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 15, color: '#fff' }}>Back home →</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </DashboardShell>
    );
  }

  // ── Step 1: Waiting for UPI (India only) ─────────────────────────────────────

  if (payStep === 1) {
    const app = UPI_APPS.find((a) => a.id === selectedUpiApp)!;
    return (
      <DashboardShell role="tenant">
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0E1413' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
            <TouchableOpacity onPress={() => { upiLaunched.current = false; setPayStep(0); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(246,244,238,0.08)', alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.75}>
              <Ionicons name="close" size={18} color="#F6F4EE" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(246,244,238,0.45)', fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>STEP 2 OF 3</Text>
              <Text style={{ color: '#F6F4EE', fontFamily: Fonts.serif, fontSize: 18, marginTop: 2 }}>Confirm in {app.name}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, alignItems: 'center' }}>
            <Stepper step={1} dark />
            <SpinningRing amount={totalAmount} />

            <View style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={{ color: '#F6F4EE', fontFamily: Fonts.serif, fontSize: 24, letterSpacing: -0.5, textAlign: 'center', lineHeight: 32 }}>
                {'Approve in ' + app.name + '\nto complete payment'}
              </Text>
              <Text style={{ color: 'rgba(246,244,238,0.5)', fontFamily: Fonts.sans, fontSize: 12, marginTop: 12, textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>
                {`Don't close this screen. We'll seal the receipt the moment ${landlordName}'s bank confirms.`}
              </Text>
            </View>

            <View style={{ marginTop: 24, padding: 14, backgroundColor: 'rgba(246,244,238,0.06)', borderRadius: 14, flexDirection: 'row', gap: 12, alignItems: 'center', width: '100%' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: app.color, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontFamily: Fonts.sansBold, fontSize: 11 }}>{app.abbr}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F6F4EE', fontFamily: Fonts.sansMedium, fontSize: 13 }} numberOfLines={1}>
                  {app.name} · {landlordUpiId ?? '—'}
                </Text>
                <Text style={{ color: 'rgba(246,244,238,0.45)', fontFamily: Fonts.sans, fontSize: 11, marginTop: 2 }}>→ {landlordName}</Text>
              </View>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: 'rgba(246,244,238,0.45)' }}>UTR pending</Text>
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <TouchableOpacity onPress={handleUPILaunch} style={{ height: 52, borderRadius: 16, backgroundColor: 'rgba(246,244,238,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(246,244,238,0.14)' }} activeOpacity={0.8}>
              <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 15, color: '#F6F4EE' }}>Open {app.name} →</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </DashboardShell>
    );
  }

  // ── Step 0: Select payment method ─────────────────────────────────────────────

  return (
    <DashboardShell role="tenant">
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.canvas }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Pay rent</Text>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.serif, fontSize: 18, marginTop: 1 }}>
              {currentPayment ? formatMonth(currentPayment.month) : 'Current Month'}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}>
          {!isPaid && !isPending && <Stepper step={0} />}

          {/* ── Paid ── */}
          {isPaid && (
            <View style={{ backgroundColor: Colors.successSoft, borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="checkmark" size={28} color="#fff" />
              </View>
              <Text style={{ color: Colors.success, fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>Paid</Text>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, marginTop: 4 }}>This month's rent is confirmed.</Text>
              {currentPayment?.payment_method && (
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 }}>
                  Paid via {(PAYMENT_METHOD_DISPLAY as Record<string, { label: string }>)[currentPayment.payment_method]?.label ?? currentPayment.payment_method}
                </Text>
              )}
            </View>
          )}

          {/* ── Pending verification ── */}
          {isPending && (
            <View style={{ backgroundColor: Colors.actionSoft, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#C7D7FF' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.action, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="time-outline" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>Awaiting confirmation</Text>
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 }}>Your landlord will confirm shortly</Text>
                </View>
              </View>
              <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 12, gap: 6 }}>
                {currentPayment?.payment_method && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, width: 90 }}>Method</Text>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, flex: 1 }}>
                      {(PAYMENT_METHOD_DISPLAY as Record<string, { label: string }>)[currentPayment.payment_method]?.label ?? currentPayment.payment_method}
                    </Text>
                  </View>
                )}
                {currentPayment?.utr_number && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, width: 90 }}>Reference</Text>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.mono, fontSize: 13, flex: 1 }}>{currentPayment.utr_number}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Can pay ── */}
          {canPay && (
            <>
              {/* Amount hero */}
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  TO {landlordName.toUpperCase()}
                </Text>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.serif, fontSize: 52, letterSpacing: -2, lineHeight: 60, marginTop: 4 }}>
                  {formatCurrency(totalAmount)}
                </Text>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {rental?.property?.name} · {currentPayment ? formatMonth(currentPayment.month) : 'Current Month'}
                </Text>
              </View>

              {/* Breakdown card */}
              <View style={{ backgroundColor: Colors.fill, borderRadius: 14, padding: 14, marginTop: 4, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink3 }}>Rent</Text>
                  <Text style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.primary, fontWeight: '600' }}>{formatCurrency(baseRent)}</Text>
                </View>
                {lateFee > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.warning }}>Late fee</Text>
                    <Text style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.warning, fontWeight: '600' }}>+{formatCurrency(lateFee)}</Text>
                  </View>
                )}
                <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 8 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 13, color: Colors.primary }}>You'll pay</Text>
                  <Text style={{ fontFamily: Fonts.serif, fontSize: 20, color: Colors.primary }}>{formatCurrency(totalAmount)}</Text>
                </View>
              </View>

              <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 16, color: Colors.primary, marginTop: 22, marginBottom: 10 }}>Pay with</Text>

              {/* ── India: UPI apps ── */}
              {isIndia && availableMethods.includes('upi') && (
                UPI_APPS.map((app) => {
                  const isSel = selectedMethod === 'upi' && selectedUpiApp === app.id;
                  return (
                    <TouchableOpacity key={app.id}
                      onPress={() => { setSelectedMethod('upi'); setSelectedUpiApp(app.id); }}
                      activeOpacity={0.8}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: isSel ? Colors.actionSoft : Colors.surface, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: isSel ? Colors.action : Colors.borderSoft }}>
                      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: app.color, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontFamily: Fonts.sansBold, fontSize: 13 }}>{app.abbr}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 15, color: Colors.primary }}>{app.name}</Text>
                        <Text style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.muted, marginTop: 1 }} numberOfLines={1}>
                          {landlordUpiId ?? 'No UPI ID set'}
                        </Text>
                      </View>
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: isSel ? 0 : 1.5, borderColor: Colors.border, backgroundColor: isSel ? Colors.action : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {isSel && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* ── Other methods (all regions) ── */}
              {availableMethods
                .filter((m) => m !== 'upi')
                .map((methodId) => {
                  const display = methodLookup[methodId];
                  const isSel = selectedMethod === methodId;
                  return (
                    <TouchableOpacity key={methodId}
                      onPress={() => setSelectedMethod(methodId)}
                      activeOpacity={0.8}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: isSel ? Colors.actionSoft : Colors.surface, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: isSel ? Colors.action : Colors.borderSoft }}>
                      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: isSel ? Colors.action : Colors.fill2, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={display.icon as never} size={20} color={isSel ? '#fff' : Colors.ink3} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 15, color: Colors.primary }}>{display.label}</Text>
                        <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.muted, marginTop: 1 }}>
                          {display.settlementTime}
                        </Text>
                      </View>
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: isSel ? 0 : 1.5, borderColor: Colors.border, backgroundColor: isSel ? Colors.action : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {isSel && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </>
          )}

          {!rental && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 15 }}>No active rental found</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        {canPay && (
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border }}>
            <TouchableOpacity style={{ width: 52, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePrimaryPay} disabled={stage !== null}
              style={{ flex: 1, height: 52, borderRadius: 16, backgroundColor: Colors.action, alignItems: 'center', justifyContent: 'center', opacity: stage !== null ? 0.6 : 1 }} activeOpacity={0.85}>
              <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 16, color: '#fff' }}>
                {stage !== null ? 'Processing…' : `Pay ${formatCurrency(totalAmount)} →`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Transfer / bank details sheet (for all non-UPI-instant methods) */}
        <BottomSheet visible={showTransferSheet} onClose={() => setShowTransferSheet(false)} scrollable>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20, marginBottom: 2 }}>
            {activeMethodDisplay.label}
          </Text>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, marginBottom: 20 }}>
            {formatCurrency(totalAmount)} · {currentPayment ? formatMonth(currentPayment.month) : 'Current Month'}
          </Text>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 6 }}>
              {activeMethodDisplay.referenceLabel} <Text style={{ color: Colors.muted }}>(optional)</Text>
            </Text>
            <TextInput value={reference} onChangeText={setReference}
              placeholder={activeMethodDisplay.referencePlaceholder}
              placeholderTextColor={Colors.muted}
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: Fonts.mono, fontSize: 15, color: Colors.primary, backgroundColor: Colors.fill }} />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 6 }}>
              Note <Text style={{ color: Colors.muted }}>(optional)</Text>
            </Text>
            <TextInput value={note} onChangeText={setNote}
              placeholder="e.g. Transferred on 3rd May at 6pm"
              placeholderTextColor={Colors.muted} multiline numberOfLines={3}
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: Fonts.sans, fontSize: 14, color: Colors.primary, backgroundColor: Colors.fill, minHeight: 76, textAlignVertical: 'top' }} />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 10 }}>
              Attach receipt <Text style={{ color: Colors.muted }}>(optional)</Text>
            </Text>
            {proofUri ? (
              <View>
                <Image source={{ uri: proofUri }} style={{ width: '100%', height: 180, borderRadius: 14 }} resizeMode="cover" />
                <TouchableOpacity onPress={() => { revokeWebPhotoUrl(proofUri); setProofUri(null); }}
                  style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.8}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity onPress={() => handlePickProof(true)} activeOpacity={0.8}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14 }}>
                    <Ionicons name="camera-outline" size={20} color={Colors.muted} />
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 14 }}>Camera</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handlePickProof(false)} activeOpacity={0.8}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14 }}>
                  <Ionicons name="images-outline" size={20} color={Colors.muted} />
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 14 }}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={handleTransferSubmit} disabled={stage !== null}
            style={{ height: 56, borderRadius: 16, backgroundColor: Colors.action, alignItems: 'center', justifyContent: 'center', opacity: stage !== null ? 0.6 : 1 }} activeOpacity={0.85}>
            <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 16, color: '#fff' }}>
              {stage === 'uploading' ? 'Uploading…' : stage === 'saving' ? 'Saving…' : 'Submit Payment →'}
            </Text>
          </TouchableOpacity>
        </BottomSheet>
      </SafeAreaView>
    </DashboardShell>
  );
}
