import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { RentPayment } from '../../types';
import { formatCurrency, formatDate, formatMonth } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { PaymentRowSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppIcon, BackButton } from '../../components/ui/Icon';
import { Cap } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { isDevAuthUserId } from '../../lib/devAuth';
import { generateHraReceiptHtml } from '../../lib/receipts';

export default function RentHistoryScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);
  const [generatingReceipt, setGeneratingReceipt] = useState<Record<string, boolean>>({});

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

  const handleGetReceipt = async (payment: RentPayment) => {
    const receiptWindow =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.open('', '_blank')
        : null;

    if (Platform.OS === 'web') {
      if (!receiptWindow) {
        showToast('Please allow pop-ups to open the HRA receipt.', 'error');
        return;
      }

      receiptWindow.document.write(
        '<!doctype html><title>Preparing receipt</title><p style="font-family:Arial;padding:24px">Preparing HRA receipt...</p>',
      );
      receiptWindow.document.close();
    }

    setGeneratingReceipt((prev) => ({ ...prev, [payment.id]: true }));
    try {
      const html = await generateHraReceiptHtml(payment.id);
      void refetch();

      if (Platform.OS === 'web') {
        receiptWindow?.document.open();
        receiptWindow?.document.write(html);
        receiptWindow?.document.close();
        receiptWindow?.focus();
        return;
      }

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save HRA Receipt',
          UTI: 'com.adobe.pdf',
        });
      } else {
        showToast('Sharing not available on this device', 'error');
      }
    } catch (err) {
      if (Platform.OS === 'web') {
        receiptWindow?.document.open();
        receiptWindow?.document.write(
          '<!doctype html><title>Receipt unavailable</title><p style="font-family:Arial;padding:24px">Receipt could not be generated. Please return to Flatvio and try again.</p>',
        );
        receiptWindow?.document.close();
      }
      showToast(err instanceof Error ? err.message : 'Could not generate receipt', 'error');
    } finally {
      setGeneratingReceipt((prev) => ({ ...prev, [payment.id]: false }));
    }
  };

  const totalPaid = payments
    ?.filter((p) => p.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0) ?? 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <BackButton onPress={() => router.back()} style={{ marginRight: 12 }} />
        <View>
          <Cap>Tenant</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
            Rent History
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Card style={{ backgroundColor: Colors.primary }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4, fontFamily: Fonts.sans }}>
              Total Paid
            </Text>
            <Text style={{ color: '#fff', fontSize: 32, fontFamily: Fonts.sansSemiBold, lineHeight: 36 }}>
              {formatCurrency(totalPaid, true)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4, fontFamily: Fonts.sans }}>
              {payments?.filter((payment) => payment.status === 'paid').length ?? 0} payments made
            </Text>
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}>
          {isLoading ? (
            <Card padded={false}>
              <View style={{ paddingHorizontal: 16 }}>
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
                  : 'Your rent payment history will appear here.'
              }
              icon={<AppIcon name="receipt-outline" size={48} color={Colors.muted} />}
            />
          ) : (
            <Card padded={false}>
              {payments.map((payment, index) => (
                <View
                  key={payment.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: index < payments.length - 1 ? 1 : 0,
                    borderBottomColor: Colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
                      {formatMonth(payment.month)}
                    </Text>
                    <StatusPill kind="payment" value={payment.status} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>
                      {payment.paid_at ? `Paid ${formatDate(payment.paid_at)}` : 'Not paid yet'}
                    </Text>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>
                  {payment.late_fee > 0 && (
                    <Text style={{ color: Colors.danger, fontFamily: Fonts.sans, fontSize: 12, marginTop: 3 }}>
                      Late fee: {formatCurrency(payment.late_fee)}
                    </Text>
                  )}
                  {payment.status === 'paid' && (
                    <TouchableOpacity
                      onPress={() => void handleGetReceipt(payment)}
                      disabled={generatingReceipt[payment.id]}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}
                    >
                      <AppIcon
                        name={generatingReceipt[payment.id] ? 'hourglass-outline' : 'document-text-outline'}
                        size={13}
                        color={Colors.action}
                      />
                      <Text style={{ color: Colors.action, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                        {generatingReceipt[payment.id] ? 'Generating PDF...' : 'HRA Receipt (PDF)'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {payment.status === 'pending_verification' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <AppIcon name="time-outline" size={13} color={Colors.muted} />
                      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
                        Receipt will be available after landlord confirmation
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
