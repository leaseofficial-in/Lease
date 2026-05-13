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
import { formatCurrency, formatMonth } from '../../lib/formatters';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppIcon } from '../../components/ui/Icon';
import { Colors, Fonts } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';
import { isDevAuthUserId } from '../../lib/devAuth';

function receiptNum(month: string, index: number): string {
  const [y, m] = month.split('-');
  return `#${y}-${m}-${String(100 + index).padStart(3, '0')}`;
}

export default function RentHistoryScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);
  const [exportVisible, setExportVisible] = useState(false);

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

  const allPaid    = payments?.filter((p) => p.status === 'paid') ?? [];
  const totalPaid  = allPaid.reduce((s, p) => s + p.amount, 0);
  const paidCount  = allPaid.length;

  const now    = new Date();
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyLabel = `FY ${fyStart}–${String(fyStart + 1).slice(2)}`;

  const currentFyPayments = allPaid.filter((p) => {
    const d = new Date(p.month);
    const py = d.getFullYear(); const pm = d.getMonth();
    return (py === fyStart && pm >= 3) || (py === fyStart + 1 && pm < 3);
  });
  const ytdAmount  = currentFyPayments.reduce((s, p) => s + p.amount, 0);
  // Estimated tax saved at 30% slab (display only)
  const taxSaved   = Math.round(ytdAmount * 0.3);

  const handleExport = () => {
    showToast(`Export initiated — ${paidCount} records`, 'success');
    setExportVisible(false);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <DashboardShell role="tenant">
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.canvas }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', marginRight: 12 }} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <View>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Section 10(13A)</Text>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>HRA receipts</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.action} />}
          contentContainerStyle={{ paddingBottom: 48 }}
        >
          {/* ── Hero card (teal) ── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
            <View style={{ backgroundColor: Colors.action, borderRadius: 22, padding: 22 }}>
              <Text style={{ color: 'rgba(246,244,238,0.6)', fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                SAVED ON TAX · {fyLabel}
              </Text>
              <Text style={{ color: '#F6F4EE', fontFamily: Fonts.serif, fontSize: 44, letterSpacing: -1.5, lineHeight: 50, marginTop: 4 }}>
                {formatCurrency(taxSaved)}
              </Text>

              {/* 3-col stat row */}
              <View style={{ flexDirection: 'row', gap: 0, marginTop: 16 }}>
                {[
                  { l: 'Receipts', v: String(paidCount) },
                  { l: 'Total rent', v: formatCurrency(ytdAmount, true) },
                  { l: 'Slab', v: '30%' },
                ].map(({ l, v }, i) => (
                  <View key={l} style={{ flex: 1, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(246,244,238,0.15)', paddingLeft: i > 0 ? 14 : 0 }}>
                    <Text style={{ color: 'rgba(246,244,238,0.5)', fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>{l}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: '#F6F4EE', fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>{v}</Text>
                  </View>
                ))}
              </View>

              {/* Export row */}
              <TouchableOpacity onPress={() => setExportVisible(true)} activeOpacity={0.8}
                style={{ marginTop: 16, padding: 10, backgroundColor: 'rgba(246,244,238,0.1)', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: 'rgba(246,244,238,0.85)' }}>Annual bundle · ready to file</Text>
                <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 12, color: Colors.accent }}>Export →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Monthly list ── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 16, color: Colors.primary }}>Monthly</Text>
              {paidCount > 0 && (
                <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 12, color: Colors.action }}>All {paidCount} →</Text>
              )}
            </View>

            {!payments?.length ? (
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
              <View style={{ gap: 0, backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, borderColor: Colors.borderSoft, overflow: 'hidden' }}>
                {payments.map((payment, index) => {
                  const isPaid    = payment.status === 'paid';
                  const isPending = payment.status === 'pending_verification';
                  const isFirst   = index === 0;
                  const isLast    = index === payments.length - 1;

                  return (
                    <TouchableOpacity
                      key={payment.id}
                      onPress={() => isPaid && router.push({ pathname: '/receipt/[paymentId]', params: { paymentId: payment.id } })}
                      activeOpacity={isPaid ? 0.8 : 1}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: Colors.borderSoft, position: 'relative' }}
                    >
                      {/* Icon */}
                      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: isPaid ? Colors.accentSoft : Colors.fill, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Ionicons
                          name={isPaid ? 'checkmark' : isPending ? 'time-outline' : 'ellipse-outline'}
                          size={18}
                          color={isPaid ? Colors.accent : isPending ? Colors.action : Colors.muted}
                        />
                      </View>

                      {/* Meta */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text numberOfLines={1} style={{ fontFamily: Fonts.mono, fontSize: 11, letterSpacing: 0.8, fontWeight: '700', color: Colors.ink3 }}>
                            {formatMonth(payment.month).toUpperCase()}
                          </Text>
                          {isFirst && isPaid && (
                            <View style={{ backgroundColor: Colors.actionSoft, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: Colors.action, fontFamily: Fonts.mono, fontSize: 8, fontWeight: '700' }}>NEW</Text>
                            </View>
                          )}
                        </View>
                        {isPaid ? (
                          <Text numberOfLines={1} style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.ink3, marginTop: 2 }}>
                            {receiptNum(payment.month, paidCount - index)}
                          </Text>
                        ) : isPending ? (
                          <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.action, marginTop: 2 }}>Awaiting confirmation</Text>
                        ) : (
                          <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.muted, marginTop: 2 }}>Not yet paid</Text>
                        )}
                      </View>

                      {/* Amount + action */}
                      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Text numberOfLines={1} style={{ fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.primary }}>
                          {formatCurrency(payment.amount)}
                        </Text>
                        {isPaid && (
                          <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 11, color: Colors.action, marginTop: 2 }}>PDF →</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Export sheet */}
        <BottomSheet visible={exportVisible} onClose={() => setExportVisible(false)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.actionSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="download-outline" size={22} color={Colors.action} />
            </View>
            <View>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20 }}>Export {fyLabel}</Text>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>{paidCount} paid · {formatCurrency(totalPaid, true)}</Text>
            </View>
          </View>

          <View style={{ backgroundColor: Colors.fill, borderRadius: 14, padding: 14, marginBottom: 16, gap: 8 }}>
            {['Month-by-month rent summary', 'Payment dates and UTR references', 'HRA receipt links for each paid month', 'Late fee breakdown (if any)'].map((item) => (
              <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 13 }}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {(['CSV', 'PDF'] as const).map((fmt) => (
              <TouchableOpacity key={fmt} onPress={handleExport} activeOpacity={0.8}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center', gap: 4 }}>
                <Ionicons name={fmt === 'PDF' ? 'document-text-outline' : 'grid-outline'} size={20} color={Colors.action} />
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>Export {fmt}</Text>
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
                  {fmt === 'PDF' ? 'Formatted report' : 'Spreadsheet data'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={() => setExportVisible(false)} activeOpacity={0.75} style={{ paddingVertical: 13, alignItems: 'center' }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </BottomSheet>
      </SafeAreaView>
    </DashboardShell>
  );
}
