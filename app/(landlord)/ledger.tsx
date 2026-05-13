import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Cap } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';
import { formatCurrency, formatDateShort, formatMonth } from '../../lib/formatters';
import { isDevAuthUserId } from '../../lib/devAuth';
import { RentPayment, RepairRequest, DepositTransaction, Proof, Rental } from '../../types';

type EntryTag = 'in' | 'out' | 'doc' | 'sys';
type LedgerFilter = 'all' | 'in' | 'out' | 'doc' | 'sys';

interface LedgerEntry {
  id: string;
  date: string;
  title: string;
  counterparty: string;
  property: string;
  amount: number;
  tag: EntryTag;
  method: string;
  ref: string;
}

const TAG_CONFIG: Record<EntryTag, { label: string; color: string; bg: string }> = {
  in:  { label: 'IN',  color: Colors.success, bg: Colors.successSoft },
  out: { label: 'OUT', color: Colors.warning,  bg: Colors.warningSoft },
  doc: { label: 'DOC', color: '#C97A3A',       bg: '#FBF1E8'         },
  sys: { label: 'SYS', color: Colors.muted,    bg: Colors.fill2      },
};

function buildLedger(
  payments: (RentPayment & { rental?: Rental | null })[],
  repairs: (RepairRequest & { rental?: Rental | null })[],
  deposits: (DepositTransaction & { rental?: Rental | null })[],
  proofs: (Proof & { rental?: Rental | null })[],
): LedgerEntry[] {
  const entries: LedgerEntry[] = [];

  // Rent received
  payments
    .filter((p) => p.status === 'paid')
    .forEach((p) => {
      entries.push({
        id: `pay-${p.id}`,
        date: p.paid_at ?? p.created_at,
        title: `Rent received · ${formatMonth(p.month)}`,
        counterparty: p.rental?.tenant?.full_name ?? 'Tenant',
        property: p.rental?.property?.name ?? 'Property',
        amount: p.amount,
        tag: 'in',
        method: p.payment_method ? p.payment_method.toUpperCase().replace('_', ' ') : 'UPI',
        ref: p.utr_number ?? p.razorpay_payment_id ?? '—',
      });
      // Auto-HRA receipt doc entry
      if (p.receipt_url) {
        entries.push({
          id: `hra-${p.id}`,
          date: p.paid_at ?? p.created_at,
          title: `HRA receipt issued`,
          counterparty: p.rental?.tenant?.full_name ?? 'Tenant',
          property: p.rental?.property?.name ?? 'Property',
          amount: 0,
          tag: 'doc',
          method: 'Auto-generated',
          ref: `PDF`,
        });
      }
    });

  // Pending / overdue payments
  payments
    .filter((p) => p.status !== 'paid')
    .forEach((p) => {
      entries.push({
        id: `pay-sys-${p.id}`,
        date: p.created_at,
        title: `Rent ${p.status} · ${formatMonth(p.month)}`,
        counterparty: p.rental?.tenant?.full_name ?? 'Tenant',
        property: p.rental?.property?.name ?? 'Property',
        amount: p.amount,
        tag: 'sys',
        method: '—',
        ref: `STATUS · ${p.status.toUpperCase()}`,
      });
    });

  // Repair expenses
  repairs
    .filter((r) => r.status === 'resolved' || r.status === 'closed')
    .forEach((r) => {
      entries.push({
        id: `repair-${r.id}`,
        date: r.resolved_at ?? r.updated_at,
        title: `Repair resolved · ${r.title}`,
        counterparty: 'Maintenance',
        property: r.rental?.property?.name ?? 'Property',
        amount: 0,
        tag: 'out',
        method: 'Vendor',
        ref: `REPAIR · ${r.priority.toUpperCase()}`,
      });
    });

  repairs
    .filter((r) => r.status === 'open' || r.status === 'in_progress')
    .forEach((r) => {
      entries.push({
        id: `repair-open-${r.id}`,
        date: r.created_at,
        title: `Repair logged · ${r.title}`,
        counterparty: r.rental?.tenant?.full_name ?? 'Tenant',
        property: r.rental?.property?.name ?? 'Property',
        amount: 0,
        tag: 'sys',
        method: 'Tenant raised',
        ref: `REPAIR · ${r.status.toUpperCase().replace('_', ' ')}`,
      });
    });

  // Deposit transactions
  deposits.forEach((d) => {
    entries.push({
      id: `dep-${d.id}`,
      date: d.created_at,
      title: d.type === 'received'
        ? 'Deposit received'
        : d.type === 'deduction'
        ? `Deposit deduction · ${d.note}`
        : `Deposit refund · ${d.note}`,
      counterparty: d.rental?.tenant?.full_name ?? 'Tenant',
      property: d.rental?.property?.name ?? 'Property',
      amount: d.amount,
      tag: d.type === 'received' ? 'in' : 'out',
      method: d.payment_method?.toUpperCase().replace('_', ' ') ?? '—',
      ref: d.reference ?? '—',
    });
  });

  // Move-in/out proofs
  proofs.forEach((p) => {
    entries.push({
      id: `proof-${p.id}`,
      date: p.created_at,
      title: p.type === 'move_in' ? 'Move-in proof submitted' : 'Move-out proof submitted',
      counterparty: p.rental?.tenant?.full_name ?? 'Tenant',
      property: p.rental?.property?.name ?? 'Property',
      amount: 0,
      tag: 'doc',
      method: 'Photo upload',
      ref: `PROOF · ${p.status.toUpperCase()}`,
    });
  });

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function LedgerScreen() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const isLocalDevUser = isDevAuthUserId(profile?.id);
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [selected, setSelected] = useState<LedgerEntry | null>(null);

  // All rentals
  const { data: rentals, isLoading: isRentalsLoading, refetch: refetchRentals, isRefetching } = useQuery({
    queryKey: ['landlord-rentals-ledger', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('*, property:properties(*), tenant:profiles!rentals_tenant_id_fkey(*)')
        .eq('landlord_id', profile!.id);
      if (error) throw error;
      return data as Rental[];
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const rentalIds = useMemo(() => rentals?.map((r) => r.id) ?? [], [rentals]);
  const rentalMap = useMemo(() => {
    const m: Record<string, Rental> = {};
    (rentals ?? []).forEach((r) => { m[r.id] = r; });
    return m;
  }, [rentals]);

  const { data: payments, isLoading: isPayLoading } = useQuery({
    queryKey: ['ledger-payments', rentalIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .in('rental_id', rentalIds)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as RentPayment[]).map((p) => ({ ...p, rental: rentalMap[p.rental_id] }));
    },
    enabled: rentalIds.length > 0 && !isLocalDevUser,
  });

  const { data: repairs, isLoading: isRepairLoading } = useQuery({
    queryKey: ['ledger-repairs', rentalIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('*')
        .in('rental_id', rentalIds)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as RepairRequest[]).map((r) => ({ ...r, rental: rentalMap[r.rental_id] }));
    },
    enabled: rentalIds.length > 0 && !isLocalDevUser,
  });

  const { data: deposits, isLoading: isDepLoading } = useQuery({
    queryKey: ['ledger-deposits', rentalIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_transactions')
        .select('*')
        .in('rental_id', rentalIds)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as DepositTransaction[]).map((d) => ({ ...d, rental: rentalMap[d.rental_id] }));
    },
    enabled: rentalIds.length > 0 && !isLocalDevUser,
  });

  const { data: proofs, isLoading: isProofLoading } = useQuery({
    queryKey: ['ledger-proofs', rentalIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select('*')
        .in('rental_id', rentalIds)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as Proof[]).map((p) => ({ ...p, rental: rentalMap[p.rental_id] }));
    },
    enabled: rentalIds.length > 0 && !isLocalDevUser,
  });

  const isLoading = isRentalsLoading || isPayLoading || isRepairLoading || isDepLoading || isProofLoading;

  const allEntries = useMemo(
    () => buildLedger(payments ?? [], repairs ?? [], deposits ?? [], proofs ?? []),
    [payments, repairs, deposits, proofs],
  );

  const filtered = useMemo(
    () => filter === 'all' ? allEntries : allEntries.filter((e) => e.tag === filter),
    [allEntries, filter],
  );

  const totalIn = useMemo(() => allEntries.filter((e) => e.tag === 'in').reduce((s, e) => s + e.amount, 0), [allEntries]);
  const totalOut = useMemo(() => allEntries.filter((e) => e.tag === 'out' && e.amount > 0).reduce((s, e) => s + e.amount, 0), [allEntries]);
  const docCount = useMemo(() => allEntries.filter((e) => e.tag === 'doc').length, [allEntries]);

  const FILTERS: { key: LedgerFilter; label: string }[] = [
    { key: 'all',  label: 'All' },
    { key: 'in',   label: 'In' },
    { key: 'out',  label: 'Out' },
    { key: 'doc',  label: 'Docs' },
    { key: 'sys',  label: 'System' },
  ];

  return (
  <DashboardShell role="landlord">
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader
        title="Activity Ledger"
        caption="Landlord"
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchRentals} tintColor={Colors.action} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Sealed banner */}
        <View style={{
          marginHorizontal: 20, marginTop: 4, marginBottom: 16,
          backgroundColor: '#FBF1E8', borderRadius: 14,
          borderWidth: 1, borderColor: '#F3D5A6',
          padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            borderWidth: 1.5, borderColor: '#C97A3A',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="lock-closed" size={16} color="#C97A3A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#8B5E2C', fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>Append-only ledger</Text>
            <Text style={{ color: '#A37840', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, marginTop: 1 }}>
              Both you and your tenant see the same record. Each entry is timestamped and sealed.
            </Text>
          </View>
        </View>

        {/* Stat tiles */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 }}>
          <StatTile
            label="FY RECEIVED"
            value={formatCurrency(totalIn, true)}
            dotColor={Colors.success}
            sub={`${allEntries.filter((e) => e.tag === 'in').length} payments`}
          />
          <StatTile
            label="EXPENSES"
            value={totalOut > 0 ? formatCurrency(totalOut, true) : '—'}
            dotColor={Colors.warning}
            sub={`${allEntries.filter((e) => e.tag === 'out').length} entries`}
          />
          <StatTile
            label="DOCUMENTS"
            value={String(docCount)}
            dotColor="#C97A3A"
            sub="receipts &amp; proofs"
          />
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.75}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: active ? Colors.primary : Colors.border,
                  backgroundColor: active ? Colors.primary : Colors.surface,
                }}
              >
                <Text style={{
                  color: active ? Colors.surface : Colors.ink2,
                  fontFamily: Fonts.sansMedium, fontSize: 13,
                }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Entries */}
        <View style={{ paddingHorizontal: 20 }}>
          {isLoading ? (
            <View style={{ gap: 10 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={{ height: 72, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border }} />
              ))}
            </View>
          ) : isLocalDevUser ? (
            <EmptyState
              title="Local demo mode"
              subtitle="Ledger is only available for real rentals."
              icon={<Ionicons name="receipt-outline" size={40} color={Colors.muted} />}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={filter === 'all' ? 'No entries yet' : `No ${filter} entries`}
              subtitle={filter === 'all' ? 'Activity will appear here as your rentals get started.' : `No ${filter} entries match this filter.`}
              icon={<Ionicons name="receipt-outline" size={40} color={Colors.muted} />}
            />
          ) : (
            <View style={{ gap: 8 }}>
              {filtered.map((entry, i) => {
                const { color, bg, label: tagLabel } = TAG_CONFIG[entry.tag];
                const prev = i > 0 ? filtered[i - 1] : null;
                const showDateHeader = !prev || new Date(prev.date).toDateString() !== new Date(entry.date).toDateString();
                return (
                  <React.Fragment key={entry.id}>
                    {showDateHeader && (() => {
                      const d = new Date(entry.date);
                      const day = d.getDate();
                      const mon = d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: i > 0 ? 14 : 0, marginBottom: 4 }}>
                          <Text style={{ color: Colors.primary, fontFamily: Fonts.serif, fontSize: 32, lineHeight: 36, letterSpacing: -1 }}>{day}</Text>
                          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>{mon}</Text>
                        </View>
                      );
                    })()}
                    <TouchableOpacity
                      onPress={() => setSelected(entry)}
                      activeOpacity={0.8}
                      style={{
                        backgroundColor: Colors.surface, borderRadius: 14,
                        borderWidth: 1, borderColor: Colors.border,
                        padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                      }}
                    >
                      {/* Tag pill */}
                      <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: bg }}>
                        <Text style={{ color, fontFamily: Fonts.sansBold, fontSize: 10, letterSpacing: 0.3 }}>{tagLabel}</Text>
                      </View>

                      {/* Content */}
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
                          {entry.title}
                        </Text>
                        <Text numberOfLines={1} style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11, marginTop: 2 }}>
                          {entry.counterparty} · {entry.property}
                        </Text>
                      </View>

                      {/* Amount */}
                      <View style={{ alignItems: 'flex-end' }}>
                        {entry.amount !== 0 ? (
                          <Text style={{
                            color: entry.tag === 'in' ? Colors.success : Colors.warning,
                            fontFamily: Fonts.sansSemiBold, fontSize: 13,
                          }}>
                            {entry.tag === 'in' ? '+' : '−'}{formatCurrency(Math.abs(entry.amount), true)}
                          </Text>
                        ) : (
                          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 11 }}>—</Text>
                        )}
                        <Ionicons name="chevron-forward" size={12} color={Colors.muted} style={{ marginTop: 2 }} />
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Entry detail sheet */}
      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && <EntryDetail entry={selected} />}
      </BottomSheet>
    </SafeAreaView>
  </DashboardShell>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, dotColor, sub }: { label: string; value: string; dotColor: string; sub: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor, flexShrink: 0 }} />
        <Text numberOfLines={1} style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.5 }}>{label}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 16, lineHeight: 20 }}>{value}</Text>
      <Text numberOfLines={1} style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 10, marginTop: 2 }}>{sub}</Text>
    </View>
  );
}

// ── Entry detail ─────────────────────────────────────────────────────────────

function EntryDetail({ entry }: { entry: LedgerEntry }) {
  const { color, bg, label: tagLabel } = TAG_CONFIG[entry.tag];
  return (
    <View>
      {/* Tag + date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: bg }}>
          <Text style={{ color, fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 0.3 }}>{tagLabel}</Text>
        </View>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 11 }}>
          {formatDateShort(entry.date)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Ionicons name="lock-closed-outline" size={11} color={Colors.muted} />
          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10 }}>SEALED</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20, lineHeight: 26, marginBottom: 4 }}>
        {entry.title}
      </Text>
      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, marginBottom: 20 }}>
        {entry.property}
      </Text>

      {/* Amount */}
      {entry.amount !== 0 && (
        <View style={{
          backgroundColor: entry.tag === 'in' ? Colors.successSoft : Colors.warningSoft,
          borderRadius: 14, padding: 16, marginBottom: 16, alignItems: 'center',
        }}>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, marginBottom: 4 }}>
            {entry.tag === 'in' ? 'RECEIVED' : 'PAID OUT'}
          </Text>
          <Text style={{ color: entry.tag === 'in' ? Colors.success : Colors.warning, fontFamily: Fonts.sansBold, fontSize: 32 }}>
            {entry.tag === 'in' ? '+' : '−'}{formatCurrency(Math.abs(entry.amount))}
          </Text>
        </View>
      )}

      {/* Meta rows */}
      <View style={{ backgroundColor: Colors.fill, borderRadius: 14, padding: 14, gap: 12 }}>
        {[
          { label: 'Counterparty', value: entry.counterparty },
          { label: 'Method', value: entry.method },
          { label: 'Reference', value: entry.ref },
          { label: 'Entry ID', value: entry.id },
        ].map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>{row.label}</Text>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, maxWidth: '60%', textAlign: 'right' }}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Chain info */}
      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <Ionicons name="lock-closed" size={12} color={Colors.muted} />
        <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 11 }}>
          Append-only · Cannot be edited or deleted
        </Text>
      </View>
    </View>
  );
}
