import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Rental, RentPayment } from '../../types';
import { formatCurrency, monthKey } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { Cap, Chip } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';
import { isDevAuthUserId } from '../../lib/devAuth';
import { listLocalRentals } from '../../lib/localRentals';
import { StatusPill } from '../../components/ui/StatusPill';

const THUMB_GRADIENTS = [
  ['#a87a4f', '#3a2811'],
  ['#9aa6a3', '#2c3834'],
  ['#c9a878', '#4a3818'],
  ['#a89280', '#3a2c24'],
  ['#7a5d35', '#2c2010'],
  ['#5b3a20', '#1e1208'],
  ['#4f5e5b', '#1c2220'],
  ['#5e483a', '#201810'],
];

const currentMonth = monthKey(new Date());

export default function PropertiesScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: rentals = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['landlord-rentals', profile?.id],
    queryFn: async () => {
      if (isLocalDevUser) return listLocalRentals(profile!.id);
      const { data, error } = await supabase
        .from('rentals')
        .select('*, property:properties(*), tenant:profiles!rentals_tenant_id_fkey(full_name, phone, avatar_url)')
        .eq('landlord_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Rental[];
    },
    enabled: !!profile?.id,
  });

  const { data: currentPayments = [] } = useQuery({
    queryKey: ['current-month-payments', profile?.id],
    queryFn: async () => {
      const rentalIds = rentals.map((r) => r.id);
      if (!rentalIds.length) return [] as RentPayment[];
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .in('rental_id', rentalIds)
        .eq('month', currentMonth);
      if (error) throw error;
      return data as RentPayment[];
    },
    enabled: !!rentals.length && !isLocalDevUser,
  });

  const { data: ytdPayments = [] } = useQuery({
    queryKey: ['ytd-payments', profile?.id],
    queryFn: async () => {
      const rentalIds = rentals.map((r) => r.id);
      if (!rentalIds.length) return [] as RentPayment[];
      const fy = new Date().getFullYear();
      const { data, error } = await supabase
        .from('rent_payments')
        .select('id, amount, rental_id')
        .in('rental_id', rentalIds)
        .eq('status', 'paid')
        .gte('month', `${fy}-04`);
      if (error) throw error;
      return data as Pick<RentPayment, 'id' | 'amount' | 'rental_id'>[];
    },
    enabled: !!rentals.length && !isLocalDevUser,
  });

  const stats = useMemo(() => {
    const active = rentals.filter((r) => r.status === 'active');
    const nonEnded = rentals.filter((r) => r.status !== 'ended');
    const totalMonthly = active.reduce((s, r) => s + Number(r.monthly_rent), 0);
    const totalDeposit = nonEnded.reduce((s, r) => s + Number(r.security_deposit), 0);
    const paid = currentPayments.filter((p) => p.status === 'paid');
    const due = currentPayments.filter((p) => p.status !== 'paid');
    const collectedAmt = paid.reduce((s, p) => s + Number(p.amount), 0);
    const pendingAmt = due.reduce((s, p) => s + Number(p.amount), 0);
    const ytdTotal = ytdPayments.reduce((s, p) => s + Number(p.amount), 0);
    return { active, nonEnded, totalMonthly, totalDeposit, paid, due, collectedAmt, pendingAmt, ytdTotal };
  }, [rentals, currentPayments, ytdPayments]);

  // Group by property
  const propertyGroups = useMemo(() => {
    const map = new Map<string, { rep: Rental; all: Rental[] }>();
    for (const r of rentals) {
      const pid = r.property_id;
      if (!map.has(pid)) map.set(pid, { rep: r, all: [] });
      map.get(pid)!.all.push(r);
    }
    return Array.from(map.values());
  }, [rentals]);

  return (
  <DashboardShell role="landlord">
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
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
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17 }}>Properties</Text>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12 }}>
            {propertyGroups.length} propert{propertyGroups.length !== 1 ? 'ies' : 'y'} · {formatCurrency(stats.totalMonthly, true)}/mo
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(landlord)/create-rental')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.primary, borderRadius: 20 }}
          activeOpacity={0.82}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Portfolio hero card */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ backgroundColor: Colors.action, borderRadius: 22, padding: 22 }}>
            <Text style={{ color: 'rgba(246,244,238,0.55)', fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' }}>
              MONTHLY RENT ROLL
            </Text>
            <Text style={{ color: '#F6F4EE', fontFamily: Fonts.serif, fontSize: 42, letterSpacing: -1.2, lineHeight: 48, marginTop: 4 }}>
              {formatCurrency(stats.totalMonthly, true)}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 0 }}>
              {[
                { l: 'Properties', v: String(propertyGroups.length) },
                { l: 'Active', v: String(stats.active.length) },
                { l: 'FY income', v: formatCurrency(stats.ytdTotal, true) },
              ].map(({ l, v }, i) => (
                <View key={l} style={{ flex: 1, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(246,244,238,0.15)', paddingLeft: i > 0 ? 14 : 0 }}>
                  <Text style={{ color: 'rgba(246,244,238,0.5)', fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>{l}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: '#F6F4EE', fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Property cards */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 14 }}>
          {isLoading ? (
            <View style={{ gap: 12 }}>
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
            </View>
          ) : propertyGroups.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 14 }}>🏠</Text>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginBottom: 8 }}>
                No properties yet
              </Text>
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
                Add your first property to start managing your rental portfolio.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(landlord)/create-rental')}
                style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 }}
                activeOpacity={0.82}
              >
                <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>Add first property</Text>
              </TouchableOpacity>
            </View>
          ) : (
            propertyGroups.map(({ rep, all }, idx) => (
              <PropertyCard
                key={rep.property_id}
                representative={rep}
                allRentals={all}
                currentPayments={currentPayments}
                colorIndex={idx}
                onPress={() => router.push({ pathname: '/(landlord)/property/[id]', params: { id: rep.property_id } })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  </DashboardShell>
  );
}

// ── Property card ─────────────────────────────────────────────────────────────

function PropertyCard({
  representative: r,
  allRentals,
  currentPayments,
  colorIndex,
  onPress,
}: {
  representative: Rental;
  allRentals: Rental[];
  currentPayments: RentPayment[];
  colorIndex: number;
  onPress: () => void;
}) {
  const [bg, darkBg] = THUMB_GRADIENTS[colorIndex % THUMB_GRADIENTS.length];
  const property = r.property;
  const tenant = r.tenant;
  const isMultiUnit = allRentals.length > 1;
  const activeRentals = allRentals.filter((x) => x.status === 'active');
  const totalRent = allRentals.reduce((s, x) => s + Number(x.monthly_rent), 0);

  // Payment status for this property's rental(s)
  const relatedPmts = currentPayments.filter((p) => allRentals.some((x) => x.id === p.rental_id));
  const paidCount = relatedPmts.filter((p) => p.status === 'paid').length;
  const dueCount = relatedPmts.filter((p) => p.status !== 'paid').length;

  const pillText = isMultiUnit
    ? `${paidCount}/${allRentals.length} paid`
    : paidCount > 0
    ? `Paid · ${formatMonthShort()}`
    : dueCount > 0
    ? 'Due this month'
    : r.status === 'pending_tenant'
    ? 'Setup pending'
    : r.status === 'active'
    ? 'No payment'
    : r.status;

  const pillTone: 'good' | 'warn' | 'outline' =
    paidCount > 0 && dueCount === 0 ? 'good'
    : dueCount > 0 ? 'warn'
    : 'outline';

  const propName = property?.name ?? 'Property';
  const city = property?.city ?? '';
  const state = property?.state ?? '';
  const tenantName = isMultiUnit
    ? `${activeRentals.length} / ${allRentals.length} units occupied`
    : tenant?.full_name ?? (r.status === 'pending_tenant' ? 'Awaiting tenant' : '—');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
      <View
        style={{
          backgroundColor: Colors.surface,
          borderWidth: 1.5,
          borderColor: Colors.border,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {/* Colour header */}
        <View
          style={{
            height: 120,
            backgroundColor: bg,
            padding: 14,
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Paid/Due pill */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: pillTone === 'good'
                  ? 'rgba(31,122,85,.85)'
                  : pillTone === 'warn'
                  ? 'rgba(201,122,58,.85)'
                  : 'rgba(255,255,255,.2)',
              }}
            >
              <Text style={{ fontFamily: Fonts.mono, fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 }}>
                {pillText.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* City + since */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: 'rgba(255,255,255,.85)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {city}
            </Text>
            {state && city !== state ? (
              <>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: 10 }}>·</Text>
                <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: 'rgba(255,255,255,.65)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {state}
                </Text>
              </>
            ) : null}
            {r.start_date ? (
              <>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: 10 }}>·</Text>
                <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: 'rgba(255,255,255,.65)', letterSpacing: 0.5 }}>
                  since {r.start_date.slice(0, 7).replace('-', '/')}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Card body */}
        <View style={{ padding: 16, gap: 4 }}>
          <Text style={{ fontFamily: Fonts.serif, fontSize: 22, lineHeight: 26, letterSpacing: -0.5, color: Colors.primary }}>
            {propName}
          </Text>
          {property?.address_line1 ? (
            <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink3, lineHeight: 17 }} numberOfLines={1}>
              {property.address_line1}
              {property.address_line2 ? `, ${property.address_line2}` : ''}
              {property.property_type ? ` · ${property.property_type}` : ''}
            </Text>
          ) : null}

          {/* Divider + footer */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
            }}
          >
            <View>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.2, color: Colors.muted, textTransform: 'uppercase' }}>
                Tenant
              </Text>
              <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.primary, marginTop: 3 }}>
                {tenantName}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.2, color: Colors.muted, textTransform: 'uppercase' }}>
                Rent
              </Text>
              <Text style={{ fontFamily: Fonts.serif, fontSize: 20, color: Colors.primary, marginTop: 2, letterSpacing: -0.3 }}>
                {formatCurrency(totalRent, true)}
                <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink3 }}>/mo</Text>
              </Text>
            </View>
          </View>

          {/* Rental status chips */}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <StatusPill kind="rental" value={r.status} />
            {isMultiUnit && <Chip tone="outline">{allRentals.length} units</Chip>}
            {property?.property_type ? <Chip tone="outline">{property.property_type}</Chip> : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PropertyCardSkeleton() {
  return (
    <View style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, overflow: 'hidden' }}>
      <View style={{ height: 120, backgroundColor: Colors.fill2 }} />
      <View style={{ padding: 16, gap: 8 }}>
        <View style={{ height: 22, width: '60%', backgroundColor: Colors.fill2, borderRadius: 4 }} />
        <View style={{ height: 14, width: '80%', backgroundColor: Colors.fill, borderRadius: 4 }} />
        <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 4 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ height: 14, width: '30%', backgroundColor: Colors.fill2, borderRadius: 4 }} />
          <View style={{ height: 14, width: '25%', backgroundColor: Colors.fill2, borderRadius: 4 }} />
        </View>
      </View>
    </View>
  );
}

function formatMonthShort() {
  return new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
