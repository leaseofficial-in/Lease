import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { RentPayment } from '../../types';
import { formatCurrency, formatDate, formatMonth } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { PaymentRowSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppIcon } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Cap } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';
import { isDevAuthUserId } from '../../lib/devAuth';

export default function RentHistoryScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);
  const [exportYear, setExportYear] = useState<number | null>(null);

  const { data: payments, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tenant-payments', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('tenant_id', profile!.id)
        .order('month', { ascending: false });
      if (error) throw error;
      return data as RentPayment[];
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const allPaid = payments?.filter((p) => p.status === 'paid') ?? [];
  const totalPaid = allPaid.reduce((s, p) => s + p.amount, 0);
  const paidCount = allPaid.length;
  const onTimeCount = allPaid.filter((p) => (p.late_fee ?? 0) === 0).length;
  const onTimePct = paidCount > 0 ? Math.round((onTimeCount / paidCount) * 100) : null;

  // HRA-eligible amount = total rent paid (max they can claim)
  const hraEligible = totalPaid;

  // Group by financial year (April–March), then calendar year as fallback
  const paymentsByYear = useMemo(() => {
    if (!payments?.length) return [];
    const map = new Map<number, RentPayment[]>();
    for (const p of payments) {
      const yr = new Date(p.month).getFullYear();
      const list = map.get(yr) ?? [];
      list.push(p);
      map.set(yr, list);
    }
    return [...map.entries()].sort(([a], [b]) => b - a);
  }, [payments]);

  // Current FY (Apr–Mar) payments for YTD
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const currentFyPayments = allPaid.filter((p) => {
    const d = new Date(p.month);
    const payYear = d.getFullYear();
    const payMonth = d.getMonth();
    return (payYear === fyStart && payMonth >= 3) || (payYear === fyStart + 1 && payMonth < 3);
  });
  const ytdAmount = currentFyPayments.reduce((s, p) => s + p.amount, 0);

  const handleExport = (year: number, yearPayments: RentPayment[]) => {
    // In production: generate & download CSV/PDF from Edge Function
    showToast(`Export initiated for ${year} — ${yearPayments.length} records`, 'success');
    setExportYear(null);
  };

  return (
  <DashboardShell role="tenant">
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Rent History" caption="Tenant" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.action} />}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Summary hero ── */}
        {(isLoading || (payments && payments.length > 0)) && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, gap: 10 }}>
            <View style={{
              backgroundColor: Colors.primary, borderRadius: 22, padding: 20,
            }}>
              {/* Top row: total + on-time ring */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
                    Total Paid (All Time)
                  </Text>
                  <Text style={{ color: '#fff', fontFamily: Fonts.sansBold, fontSize: 34, lineHeight: 38 }}>
                    {isLoading ? '—' : formatCurrency(totalPaid, true)}
                  </Text>
                  {!isLoading && paidCount > 0 && (
                    <Text style={{ color: 'rgba(255,255,255,0.42)', fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 }}>
                      {paidCount} payment{paidCount !== 1 ? 's' : ''} confirmed
                    </Text>
                  )}
                </View>
                {onTimePct !== null && (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <View style={{
                      width: 56, height: 56, borderRadius: 28,
                      borderWidth: 3,
                      borderColor: onTimePct >= 80 ? Colors.success : Colors.warning,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{
                        color: onTimePct >= 80 ? '#7AEFC0' : '#F6C47F',
                        fontFamily: Fonts.sansBold, fontSize: 15,
                      }}>
                        {onTimePct}%
                      </Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: Fonts.sans, fontSize: 10 }}>
                      on time
                    </Text>
                  </View>
                )}
              </View>

              {/* Stat grid */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.5, marginBottom: 4 }}>
                    FY {fyStart}–{String(fyStart + 1).slice(2)} YTD
                  </Text>
                  <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
                    {formatCurrency(ytdAmount, true)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.38)', fontFamily: Fonts.sans, fontSize: 10, marginTop: 2 }}>
                    {currentFyPayments.length} months this FY
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.5, marginBottom: 4 }}>
                    HRA ELIGIBLE
                  </Text>
                  <Text style={{ color: '#7AEFC0', fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
                    {formatCurrency(hraEligible, true)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.38)', fontFamily: Fonts.sans, fontSize: 10, marginTop: 2 }}>
                    Claim with employer
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Payment list ── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, paddingTop: 12 }}>
          {isLoading ? (
            <Card padded={false}>
              <View style={{ paddingHorizontal: 16 }}>
                <PaymentRowSkeleton />
                <PaymentRowSkeleton />
                <PaymentRowSkeleton />
              </View>
            </Card>
          ) : !payments?.length ? (
            <EmptyState
              title="No payments yet"
              subtitle={
                isLocalDevUser
                  ? 'Local demo mode skips live payment records.'
                  : 'Your rent payment history will appear here once you start paying.'
              }
              icon={<AppIcon name="receipt-outline" size={48} color={Colors.muted} />}
            />
          ) : (
            <View style={{ gap: 24 }}>
              {paymentsByYear.map(([year, yearPayments]) => {
                const yearPaid = yearPayments.filter((p) => p.status === 'paid');
                const yearTotal = yearPaid.reduce((s, p) => s + p.amount, 0);
                return (
                  <View key={year}>
                    {/* Year header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Text style={{ color: Colors.ink2, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
                        {year}
                      </Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
                        {formatCurrency(yearTotal, true)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setExportYear(year)}
                        activeOpacity={0.75}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
                          backgroundColor: Colors.fill2,
                        }}
                      >
                        <Ionicons name="download-outline" size={12} color={Colors.ink3} />
                        <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 11 }}>Export</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Payment rows */}
                    <Card padded={false}>
                      {yearPayments.map((payment, index) => (
                        <PaymentRow
                          key={payment.id}
                          payment={payment}
                          isLast={index === yearPayments.length - 1}
                          onReceipt={() => router.push({ pathname: '/receipt/[paymentId]', params: { paymentId: payment.id } })}
                        />
                      ))}
                    </Card>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Export year sheet */}
      <BottomSheet visible={exportYear !== null} onClose={() => setExportYear(null)}>
        {exportYear !== null && (
          <ExportYearContent
            year={exportYear}
            payments={paymentsByYear.find(([yr]) => yr === exportYear)?.[1] ?? []}
            onExport={() => handleExport(exportYear, paymentsByYear.find(([yr]) => yr === exportYear)?.[1] ?? [])}
            onClose={() => setExportYear(null)}
          />
        )}
      </BottomSheet>
    </SafeAreaView>
  </DashboardShell>
  );
}

// ── Payment row ───────────────────────────────────────────────────────────────

function PaymentRow({
  payment,
  isLast,
  onReceipt,
}: {
  payment: RentPayment;
  isLast: boolean;
  onReceipt: () => void;
}) {
  const isOverdue = payment.status === 'overdue';
  const isPending = payment.status === 'pending_verification';
  const isPaid = payment.status === 'paid';
  const hasLateFee = (payment.late_fee ?? 0) > 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.82}
      style={{
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: Colors.border,
        backgroundColor: isOverdue ? Colors.dangerSoft : Colors.surface,
      }}
    >
      {/* Main row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginBottom: 2 }}>
            {formatMonth(payment.month)}
          </Text>
          {isPaid && payment.paid_at && (
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
              Paid {formatDate(payment.paid_at)}
            </Text>
          )}
          {isPending && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={12} color={Colors.muted} />
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
                Awaiting confirmation
              </Text>
            </View>
          )}
          {!payment.paid_at && !isPending && (
            <Text style={{ color: isOverdue ? Colors.danger : Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
              {isOverdue ? 'Overdue' : 'Not paid yet'}
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
            {formatCurrency(payment.amount)}
          </Text>
          <StatusPill kind="payment" value={payment.status} />
        </View>
      </View>

      {/* Secondary row: late fee + receipt */}
      {(hasLateFee || isPaid) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          {hasLateFee ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="alert-circle" size={13} color={Colors.danger} />
              <Text style={{ color: Colors.danger, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                Late fee: {formatCurrency(payment.late_fee)}
              </Text>
            </View>
          ) : <View />}
          {isPaid && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); onReceipt(); }}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
                backgroundColor: Colors.actionSoft, borderWidth: 1, borderColor: '#C7D7FF',
              }}
            >
              <AppIcon name="document-text-outline" size={13} color={Colors.action} />
              <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>
                HRA Receipt
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Expanded detail: method + UTR */}
      {expanded && (payment.payment_method || payment.utr_number || payment.payment_note) && (
        <View style={{
          marginTop: 10, backgroundColor: Colors.fill, borderRadius: 10, padding: 10, gap: 6,
        }}>
          {payment.payment_method && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>Method</Text>
              <Text style={{ color: Colors.ink2, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                {payment.payment_method.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          )}
          {payment.utr_number && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>UTR / Ref</Text>
              <Text style={{ color: Colors.ink2, fontFamily: Fonts.mono, fontSize: 12 }}>{payment.utr_number}</Text>
            </View>
          )}
          {payment.payment_note && (
            <View>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginBottom: 2 }}>Note</Text>
              <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16 }}>
                {payment.payment_note}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Export year bottom sheet ──────────────────────────────────────────────────

function ExportYearContent({
  year,
  payments,
  onExport,
  onClose,
}: {
  year: number;
  payments: RentPayment[];
  onExport: () => void;
  onClose: () => void;
}) {
  const paidRows = payments.filter((p) => p.status === 'paid');
  const yearTotal = paidRows.reduce((s, p) => s + p.amount, 0);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 14,
          backgroundColor: Colors.actionSoft, alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="download-outline" size={22} color={Colors.action} />
        </View>
        <View>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20 }}>Export {year}</Text>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>
            {paidRows.length} paid · {formatCurrency(yearTotal, true)}
          </Text>
        </View>
      </View>

      {/* What's included */}
      <View style={{ backgroundColor: Colors.fill, borderRadius: 14, padding: 14, marginBottom: 16, gap: 10 }}>
        <Cap style={{ marginBottom: 0 }}>What's included</Cap>
        {[
          'Month-by-month rent summary',
          'Payment dates and UTR references',
          'HRA receipt links for each paid month',
          'Late fee breakdown (if any)',
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 13 }}>{item}</Text>
          </View>
        ))}
      </View>

      {/* Format selector */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {['CSV', 'PDF'].map((fmt) => (
          <TouchableOpacity
            key={fmt}
            onPress={onExport}
            activeOpacity={0.8}
            style={{
              flex: 1, paddingVertical: 14, borderRadius: 14,
              borderWidth: 1.5, borderColor: Colors.border,
              backgroundColor: Colors.surface,
              alignItems: 'center', gap: 4,
            }}
          >
            <Ionicons name={fmt === 'PDF' ? 'document-text-outline' : 'grid-outline'} size={20} color={Colors.action} />
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>Export {fmt}</Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
              {fmt === 'PDF' ? 'Formatted report' : 'Spreadsheet data'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.75}
        style={{ paddingVertical: 13, alignItems: 'center' }}
      >
        <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 14 }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}
