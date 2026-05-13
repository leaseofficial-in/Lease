import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Svg, Circle as SvgCircle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { RentPayment } from '../../types';
import { monthKey } from '../../lib/formatters';
import { isPaymentSettled } from '../../lib/payments';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Colors, Fonts } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';

const MAX_SCORE = 900;

function scoreBand(s: number): { label: string; color: string } {
  if (s >= 850) return { label: 'EXCELLENT', color: '#1F7A55' };
  if (s >= 750) return { label: 'GOOD',      color: Colors.action };
  if (s >= 650) return { label: 'FAIR',      color: Colors.warning };
  return          { label: 'NEEDS WORK', color: Colors.danger };
}

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

export default function ScoreScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const arcAnim = useRef(new Animated.Value(0)).current;

  const { data: rental, isLoading: loadingRental } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('*, property:properties(name)')
        .eq('tenant_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery<RentPayment[]>({
    queryKey: ['tenant-payments', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('month', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RentPayment[];
    },
    enabled: !!rental?.id,
  });

  const { data: proof } = useQuery({
    queryKey: ['tenant-proof', rental?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('proofs')
        .select('id')
        .eq('rental_id', rental!.id)
        .eq('proof_type', 'move_in')
        .maybeSingle();
      return data;
    },
    enabled: !!rental?.id,
  });

  const { data: openRepairs = 0 } = useQuery<number>({
    queryKey: ['open-repairs', rental?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('repair_requests')
        .select('*', { count: 'exact', head: true })
        .eq('rental_id', rental!.id)
        .in('status', ['open', 'in_progress']);
      return count ?? 0;
    },
    enabled: !!rental?.id,
  });

  // Score computation
  const paidPayments   = payments.filter((p) => isPaymentSettled(p));
  const totalPayments  = payments.length;
  const onTimePct      = totalPayments > 0 ? paidPayments.length / totalPayments : 0;
  const currentMonth   = monthKey();
  const currentPaid    = payments.some((p) => p.month === currentMonth && isPaymentSettled(p));
  const hasProof       = !!proof;

  const score = Math.min(MAX_SCORE, Math.round(
    700
    + onTimePct * 70
    + (currentPaid ? 30 : 0)
    + (hasProof ? 25 : 0)
    + (openRepairs === 0 ? 15 : 0)
  ));

  const { label: bandLabel, color: bandColor } = scoreBand(score);

  useEffect(() => {
    if (!loadingPayments) {
      Animated.timing(arcAnim, {
        toValue: score / MAX_SCORE,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [loadingPayments, score]);

  if (loadingRental || loadingPayments) return <LoadingScreen />;

  const R  = 78;
  const C  = 2 * Math.PI * R;
  const cx = 100; const cy = 100;

  const bars: { label: string; value: string; pct: number }[] = [
    { label: 'On-time rent',                value: `${paidPayments.length}/${totalPayments} mo · ${Math.round(onTimePct * 100)}%`, pct: onTimePct },
    { label: 'Move-in proof submitted',      value: hasProof ? '100%' : '0%',                                                       pct: hasProof ? 1 : 0 },
    { label: 'Past deposits returned in full', value: '—',                                                                           pct: 0.9 },
    { label: 'Repairs reported & resolved',  value: String(openRepairs === 0 ? 'All clear' : `${openRepairs} open`),                 pct: openRepairs === 0 ? 1 : 0.6 },
  ];

  return (
    <DashboardShell role="tenant">
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.canvas }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', marginRight: 12 }} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <View>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Reputation · live</Text>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>My score</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Score card */}
          <View style={{ backgroundColor: Colors.surface, borderRadius: 0, paddingTop: 24, paddingBottom: 28, paddingHorizontal: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <View style={{ backgroundColor: bandColor + '18', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 4 }}>
              <Text style={{ color: bandColor, fontFamily: Fonts.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 }}>{bandLabel}</Text>
            </View>

            {/* SVG dial */}
            <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
              <Svg viewBox="0 0 200 200" width={200} height={200} style={{ position: 'absolute' }}>
                {/* Track */}
                <SvgCircle cx={cx} cy={cy} r={R} fill="none" stroke={Colors.fill2} strokeWidth={14} />
                {/* Tick dots */}
                {Array.from({ length: 6 }, (_, i) => {
                  const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
                  return <SvgCircle key={i} cx={cx + Math.cos(a) * 94} cy={cy + Math.sin(a) * 94} r={2.5} fill={Colors.fill2} />;
                })}
              </Svg>
              {/* Animated arc — using Animated.View overlay approach */}
              <Svg viewBox="0 0 200 200" width={200} height={200} style={{ position: 'absolute' }}>
                <SvgCircle
                  cx={cx} cy={cy} r={R}
                  fill="none"
                  stroke={bandColor}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeDasharray={`${C * (score / MAX_SCORE)} ${C}`}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              </Svg>
              {/* Center text */}
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ color: bandColor, fontFamily: Fonts.serif, fontSize: 56, lineHeight: 56, letterSpacing: -2 }}>{score}</Text>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.mono, fontSize: 12, marginTop: 4 }}>/ {MAX_SCORE}</Text>
              </View>
            </View>

            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, marginTop: 8 }}>
              {paidPayments.length > 0 ? `+${Math.round(onTimePct * 18)} in last 90 days` : 'Start paying on time to build your score'}
            </Text>
          </View>

          {/* Breakdown bars */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>
              WHAT BUILDS YOUR SCORE
            </Text>
            {bars.map(({ label, value, pct }) => (
              <View key={label} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: Colors.primary }}>{label}</Text>
                  <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 13, color: Colors.ink3 }}>{value}</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: Colors.fill2, overflow: 'hidden' }}>
                  <View style={{ width: `${pct * 100}%` as `${number}%`, height: 6, borderRadius: 3, backgroundColor: pct >= 0.9 ? Colors.success : pct >= 0.6 ? Colors.action : Colors.warning }} />
                </View>
              </View>
            ))}
          </View>

          {/* Tips banner */}
          <View style={{ marginHorizontal: 20, marginTop: 6, padding: 16, backgroundColor: Colors.accentSoft, borderRadius: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 22 }}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.primary, marginBottom: 4 }}>3 ways to reach 900</Text>
              <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink3, lineHeight: 18 }}>
                Submit move-out proof at end of tenancy · Pay 1 more month on time · Keep current repair on schedule
              </Text>
            </View>
          </View>

          {/* Carry score card */}
          <View style={{ marginHorizontal: 20, marginTop: 12, backgroundColor: Colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: Colors.borderSoft }}>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>CARRY THIS SCORE</Text>
            <Text style={{ fontFamily: Fonts.serif, fontSize: 18, letterSpacing: -0.3, color: Colors.primary, lineHeight: 24 }}>
              Your reputation travels with you to your next rental — no more starting over.
            </Text>
            <TouchableOpacity activeOpacity={0.8} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
              <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 12, color: Colors.action }}>Show landlord a verified link</Text>
              <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 12, color: Colors.action }}>→</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardShell>
  );
}
