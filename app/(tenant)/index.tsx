import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Proof, Rental, RentPayment, RepairRequest } from '../../types';
import { formatCurrency, formatDateShort, formatMonth, formatPhone, monthKey } from '../../lib/formatters';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { AppIcon, type AppIconName } from '../../components/ui/Icon';
import { ActivityFeed } from '../../components/rental/ActivityFeed';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { Cap } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';
import { isDevAuthUserId } from '../../lib/devAuth';
import { buildRentalActivity } from '../../lib/rentalActivity';
import { scheduleRentReminder } from '../../lib/notifications';
import { checkAndMarkOverdue } from '../../lib/payments';

export default function TenantDashboard() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: rental, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data: active, error: activeError } = await supabase
        .from('rentals')
        .select(`*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(*)`)
        .eq('tenant_id', profile!.id)
        .neq('status', 'ended')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activeError) throw activeError;
      if (active) return active as Rental;
      const { data, error } = await supabase
        .from('rentals')
        .select(`*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(*)`)
        .eq('tenant_id', profile!.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Rental | null;
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const { data: currentPayment } = useQuery({
    queryKey: ['current-payment', rental?.id],
    queryFn: async () => {
      const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rental!.id)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data as RentPayment | null;
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { data: recentPayments } = useQuery({
    queryKey: ['tenant-payments-preview', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as RentPayment[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { data: recentRepairs } = useQuery({
    queryKey: ['tenant-repairs-preview', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data as RepairRequest[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { data: unreadNotifCount } = useQuery({
    queryKey: ['tenant-unread-notifications', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .eq('read', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profile?.id,
  });

  const { data: recentProofs } = useQuery({
    queryKey: ['tenant-proofs-preview', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as Proof[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { data: openRepairsCount } = useQuery({
    queryKey: ['tenant-open-repairs-count', rental?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('repair_requests')
        .select('id', { count: 'exact', head: true })
        .eq('rental_id', rental!.id)
        .in('status', ['open', 'in_progress']);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  useEffect(() => {
    if (!rental || rental.status !== 'active' || isLocalDevUser) return;
    void scheduleRentReminder(rental.id, rental.rent_due_day, rental.monthly_rent, rental.late_fee_percent ?? 5);
    checkAndMarkOverdue(rental.id, profile!.id, rental.rent_due_day, rental.monthly_rent, rental.late_fee_percent ?? 5)
      .then(() => queryClient.invalidateQueries({ queryKey: ['current-payment', rental.id] }))
      .catch(() => {});
  }, [rental?.id, rental?.status, isLocalDevUser]);

  useEffect(() => {
    if (isLoading || isLocalDevUser) return;
    AsyncStorage.getItem('rentybase.pending_join_token').then((pendingToken) => {
      if (!pendingToken) return;
      AsyncStorage.removeItem('rentybase.pending_join_token');
      if (!rental) {
        router.push({ pathname: '/(tenant)/join', params: { prefillToken: pendingToken } });
      }
    });
  }, [isLoading, isLocalDevUser, rental, router]);

  if (isLoading) return <LoadingScreen />;

  const activity = rental
    ? buildRentalActivity({
        rental,
        payments: recentPayments ?? (currentPayment ? [currentPayment] : []),
        repairs: recentRepairs ?? [],
        proofs: recentProofs ?? [],
      })
    : [];

  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  const currentDueDate = rental
    ? new Date(new Date().getFullYear(), new Date().getMonth(), Math.min(rental.rent_due_day, 28))
    : null;
  const nextDueDate = rental
    ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, Math.min(rental.rent_due_day, 28))
    : null;
  const daysUntilDue = currentDueDate
    ? Math.ceil((currentDueDate.getTime() - todayMidnight.getTime()) / 86_400_000)
    : null;

  const paidPayments = (recentPayments ?? []).filter((p) => p.status === 'paid');
  const paidCount = paidPayments.length;
  const onTimePct = paidCount > 0 ? Math.min(100, Math.round((paidPayments.filter((p) => (p.late_fee ?? 0) === 0).length / paidCount) * 100)) : 100;
  const hasProof = (recentProofs ?? []).length > 0;
  const openRepairs = openRepairsCount ?? 0;

  const score = Math.min(900, Math.round(
    700 + (onTimePct * 0.7) +
    (currentPayment?.status === 'paid' ? 30 : currentPayment?.status === 'pending_verification' ? 18 : 0) +
    (hasProof ? 25 : 0) + (openRepairs === 0 ? 15 : 0)
  ));

  function scoreBand(s: number) {
    if (s >= 850) return { label: 'EXCELLENT', color: Colors.success };
    if (s >= 750) return { label: 'TRUSTED',   color: Colors.action  };
    if (s >= 650) return { label: 'GOOD',      color: Colors.warning };
    return               { label: 'BUILDING',  color: Colors.muted   };
  }
  const { label: bandLabel, color: bandColor } = scoreBand(score);

  // HRA YTD: sum of paid payments this FY (Apr–Mar)
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const hraYtd = paidPayments
    .filter((p) => {
      const d = new Date(p.month);
      return (d.getFullYear() === fyStart && d.getMonth() >= 3) || (d.getFullYear() === fyStart + 1 && d.getMonth() < 3);
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const isCurrentPaid = currentPayment?.status === 'paid';
  const nextRentDate = isCurrentPaid ? nextDueDate : currentDueDate;
  const nextRentMonth = isCurrentPaid
    ? monthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))
    : monthKey(new Date());

  return (
  <DashboardShell role="tenant">
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accent} />}
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        {/* ── Top bar ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.serif, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, marginTop: 2 }}>
              Hi <Text style={{ fontStyle: 'italic', color: Colors.action }}>{firstName}.</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push('/(tenant)/notifications')}
              activeOpacity={0.75}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderSoft, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
              {(unreadNotifCount ?? 0) > 0 && (
                <View style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, borderWidth: 2, borderColor: Colors.background }} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tenant)/profile')} activeOpacity={0.75}>
              <Avatar name={profile?.full_name ?? 'T'} uri={profile?.avatar_url} size={36} />
            </TouchableOpacity>
          </View>
        </View>

        {!rental ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 32 }}>
            <EmptyState
              title="No rental yet"
              subtitle="Ask your landlord for an invite link, then join the rental from here."
              actionLabel="Join via Link"
              onAction={() => router.push('/(tenant)/join')}
              icon={<AppIcon name="home-outline" size={42} color={Colors.muted} />}
            />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>

            {/* ── Ochre hero — Next rent ── */}
            <View style={{
              borderRadius: 22, padding: 22, overflow: 'hidden',
              backgroundColor: '#2A1E15',
            }}>
              {/* Background gradient overlay via absolute layer */}
              <View style={{ position: 'absolute', top: 0, right: 0, width: '60%', height: '100%', borderRadius: 22 }}
                pointerEvents="none"
              />
              <Text style={{ color: 'rgba(246,244,238,0.65)', fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' }}>
                {isCurrentPaid ? 'NEXT RENT · ' : 'DUE · '}{formatMonth(nextRentMonth).toUpperCase()}
              </Text>
              <Text style={{ color: '#F6F4EE', fontFamily: Fonts.sansSemiBold, fontSize: 44, lineHeight: 50, letterSpacing: -1.5, marginTop: 4 }}>
                {formatCurrency(rental.monthly_rent)}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: 'rgba(246,244,238,0.85)', fontFamily: Fonts.sans, fontSize: 13 }}>
                  {nextRentDate && daysUntilDue !== null && daysUntilDue > 0
                    ? <>Due in <Text style={{ color: '#fff', fontWeight: '700' }}>{daysUntilDue} days</Text> · {nextRentDate.getDate()} {nextRentDate.toLocaleString('en-IN', { month: 'short' })}</>
                    : daysUntilDue === 0
                    ? <Text style={{ color: Colors.accent }}>Due today</Text>
                    : isCurrentPaid
                    ? <Text style={{ color: '#7AEFC0' }}>All clear this month ✓</Text>
                    : 'Pay when ready'}
                </Text>
                {isCurrentPaid && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontFamily: Fonts.mono, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 }}>
                      {formatMonth(monthKey(new Date())).toUpperCase().slice(0, 3)} PAID ✓
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
                <TouchableOpacity
                  onPress={() => router.push('/(tenant)/pay-rent')}
                  activeOpacity={0.85}
                  style={{ flex: 1, paddingVertical: 13, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#0E1413', fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>Pay via UPI →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(tenant)/rent-history')}
                  activeOpacity={0.85}
                  style={{ paddingVertical: 13, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>History</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Agreement / move-out nudges ── */}
            {rental.agreement_url && !rental.agreement_signed_at && (
              <TouchableOpacity
                onPress={() => router.push('/(tenant)/agreement')}
                activeOpacity={0.85}
                style={{ backgroundColor: Colors.warningSoft, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F1D39B' }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.warning, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>Agreement ready to sign</Text>
                  <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, marginTop: 1 }}>Tap to review and sign</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.warning} />
              </TouchableOpacity>
            )}

            {rental.status === 'pending_moveout' && (
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(tenant)/proof/upload', params: { type: 'move_out' } })}
                activeOpacity={0.85}
                style={{ backgroundColor: '#EDE9FE', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#C4B5FD' }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="exit-outline" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#7C3AED', fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>Upload move-out photos</Text>
                  <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, marginTop: 1 }}>Complete your handover</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
              </TouchableOpacity>
            )}

            {/* ── Score + HRA 2-col ── */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => router.push('/(tenant)/score' as never)}
                activeOpacity={0.82}
                style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.borderSoft }}
              >
                <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' }}>TENANT SCORE</Text>
                <Text style={{ color: bandColor, fontFamily: Fonts.sansBold, fontSize: 34, lineHeight: 38, letterSpacing: -1, marginTop: 4 }}>{score}</Text>
                <View style={{ backgroundColor: bandColor + '1A', borderRadius: 20, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 }}>
                  <Text style={{ color: bandColor, fontFamily: Fonts.mono, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 }}>{bandLabel}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tenant)/rent-history')}
                activeOpacity={0.82}
                style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.borderSoft }}
              >
                <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' }}>HRA YTD</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 34, lineHeight: 38, letterSpacing: -1, marginTop: 4 }}>
                  {formatCurrency(hraYtd > 0 ? hraYtd : rental.monthly_rent * (paidCount || 1), true)}
                </Text>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 11, marginTop: 4 }}>Est. tax saved this year</Text>
              </TouchableOpacity>
            </View>

            {/* ── Landlord card ── */}
            {rental.landlord && (
              <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.borderSoft, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={rental.landlord.full_name || 'L'} uri={rental.landlord.avatar_url} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
                    {rental.landlord.full_name || 'Name not set'}
                  </Text>
                  <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 11, marginTop: 2 }}>
                    Landlord · ✓ Verified
                  </Text>
                </View>
                {rental.landlord.phone && (
                  <TouchableOpacity
                    onPress={() => void Linking.openURL(`tel:${rental.landlord!.phone}`)}
                    activeOpacity={0.75}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.action, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="call" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── Quick actions 2×2 grid ── */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.serif, fontSize: 19, letterSpacing: -0.3 }}>Quick</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <QuickRow
                  icon="receipt-outline"
                  iconBg={Colors.accentSoft}
                  iconColor={Colors.accent}
                  title="HRA receipts"
                  sub={paidCount > 0 ? `${paidCount} sealed · FY ${fyStart}–${String(fyStart + 1).slice(2)}` : 'View receipts'}
                  onPress={() => router.push('/(tenant)/rent-history')}
                />
                <QuickRow
                  icon="camera-outline"
                  iconBg={Colors.actionSoft}
                  iconColor={Colors.action}
                  title="Move-in proof"
                  sub={(recentProofs ?? []).length > 0 ? `${(recentProofs ?? []).length} sealed` : 'Upload photos'}
                  onPress={() => router.push('/(tenant)/proof/upload')}
                />
                <QuickRow
                  icon="construct-outline"
                  iconBg={Colors.fill2}
                  iconColor={Colors.ink3}
                  title="Raise repair"
                  sub={openRepairs > 0 ? `${openRepairs} in progress` : 'No open requests'}
                  badge={openRepairs > 0 ? String(openRepairs) : undefined}
                  onPress={() => router.push('/(tenant)/repairs')}
                />
                <QuickRow
                  icon="star-outline"
                  iconBg={bandColor + '1A'}
                  iconColor={bandColor}
                  title="My score"
                  sub={`${score} / 900`}
                  onPress={() => router.push('/(tenant)/score' as never)}
                />
              </View>
            </View>

            {/* ── Activity ── */}
            {activity.length > 0 && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.serif, fontSize: 19, letterSpacing: -0.3 }}>Activity</Text>
                  <TouchableOpacity onPress={() => router.push('/(tenant)/rent-history')} activeOpacity={0.75}>
                    <Text style={{ color: Colors.action, fontFamily: Fonts.sansMedium, fontSize: 12 }}>All →</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderSoft, overflow: 'hidden' }}>
                  <ActivityFeed items={activity} limit={3} />
                </View>
              </View>
            )}

            {/* ── Deposit quick-view ── */}
            {(rental.security_deposit ?? 0) > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(tenant)/deposit')}
                activeOpacity={0.82}
                style={{ backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderSoft, padding: 14, flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: Colors.actionSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={Colors.action} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
                    {formatCurrency(rental.security_deposit)} Deposit
                  </Text>
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 1 }}>
                    Held by landlord · Tap to view
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
              </TouchableOpacity>
            )}

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  </DashboardShell>
  );
}

function QuickRow({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  badge,
  onPress,
}: {
  icon: AppIconName;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={{
        width: '48.5%',
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.borderSoft,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
        <AppIcon name={icon} size={16} color={iconColor} />
        {badge && (
          <View style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.warning, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.surface }}>
            <Text style={{ color: '#fff', fontSize: 8, fontFamily: Fonts.sansBold, lineHeight: 10 }}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>{title}</Text>
        <Text numberOfLines={1} style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 11, marginTop: 1 }}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );
}
