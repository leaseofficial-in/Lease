import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BackButton, AppIcon, type AppIconName } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Cap } from '../../../components/ui/V2';
import { Colors, Fonts } from '../../../constants/theme';
import { Config } from '../../../constants/config';
import { formatCurrency, formatMonth } from '../../../lib/formatters';
import { generateHraReceiptHtml } from '../../../lib/receipts';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { RentPayment } from '../../../types';

type PaymentReceiptMeta = RentPayment & {
  rental?: { landlord_id: string; tenant_id: string | null } | null;
};

type ReceiptFrame = {
  contentWindow?: {
    focus: () => void;
    print: () => void;
  };
};

export default function HraReceiptScreen() {
  const router = useRouter();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const receiptFrameRef = useRef<ReceiptFrame | null>(null);
  const [sharingReceipt, setSharingReceipt] = useState(false);

  const {
    data: payment,
    isLoading: paymentLoading,
    refetch: refetchPayment,
  } = useQuery({
    queryKey: ['tenant-payment-receipt-meta', paymentId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*, rental:rentals(landlord_id, tenant_id)')
        .eq('id', paymentId!)
        .single();
      if (error) throw error;
      const payment = data as PaymentReceiptMeta;
      const canView = payment.tenant_id === profile!.id || payment.rental?.landlord_id === profile!.id;
      if (!canView) throw new Error('You do not have access to this receipt');
      return payment;
    },
    enabled: !!paymentId && !!profile?.id,
  });

  const {
    data: receiptHtml,
    isLoading: receiptLoading,
    isRefetching,
    refetch: refetchReceipt,
    error,
  } = useQuery({
    queryKey: ['hra-receipt-html', paymentId, profile?.id],
    queryFn: () => generateHraReceiptHtml(paymentId!),
    enabled: !!paymentId && !!profile?.id,
    staleTime: 1000 * 60 * 5,
  });

  const receiptPageUrl =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.href
      : `${Config.publicAppUrl}/receipt/${paymentId}`;

  const refreshReceipt = async () => {
    await Promise.all([refetchPayment(), refetchReceipt()]);
  };

  const handlePrintOrSave = async () => {
    if (!receiptHtml) return;

    if (Platform.OS === 'web') {
      const frameWindow = receiptFrameRef.current?.contentWindow;
      if (!frameWindow) {
        showToast('Receipt preview is still loading', 'error');
        return;
      }
      frameWindow.focus();
      frameWindow.print();
      return;
    }

    setSharingReceipt(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: receiptHtml, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast('Sharing is not available on this device', 'error');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save HRA Receipt',
        UTI: 'com.adobe.pdf',
      });
    } catch (shareError) {
      showToast(shareError instanceof Error ? shareError.message : 'Could not prepare receipt', 'error');
    } finally {
      setSharingReceipt(false);
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(receiptPageUrl);
    showToast('Receipt link copied', 'success');
  };

  const isLoading = paymentLoading || receiptLoading;
  const title = payment ? `${formatMonth(payment.month)} receipt` : 'HRA Receipt';

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
        <ReceiptHeader
          title="HRA Receipt"
          onBack={() => router.back()}
          onPrint={handlePrintOrSave}
          onCopyLink={handleCopyLink}
          actionDisabled
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <ActivityIndicator size="small" color={Colors.action} />
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, marginTop: 10 }}>
            Preparing your receipt
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !receiptHtml) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
        <ReceiptHeader
          title="HRA Receipt"
          onBack={() => router.back()}
          onPrint={handlePrintOrSave}
          onCopyLink={handleCopyLink}
          actionDisabled
        />
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <Card>
            <Cap>Receipt unavailable</Cap>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginTop: 8 }}>
              Could not open this receipt
            </Text>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
              {error instanceof Error ? error.message : 'Please try again after the landlord confirms this payment.'}
            </Text>
            <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 18 }} fullWidth />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      <ReceiptHeader
        title={title}
        onBack={() => router.back()}
        onPrint={handlePrintOrSave}
        onCopyLink={handleCopyLink}
        actionDisabled={!receiptHtml || sharingReceipt}
        printing={sharingReceipt}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refreshReceipt} />}
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
          paddingTop: Platform.OS === 'web' ? 24 : 18,
          paddingBottom: Platform.OS === 'web' ? 28 : 40,
        }}
      >
        {payment && (
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Cap>Paid Month</Cap>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 4 }}>
                  {formatMonth(payment.month)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Cap>Amount</Cap>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 4 }}>
                  {formatCurrency(payment.amount)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {Platform.OS === 'web' ? (
          <View
            style={{
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {React.createElement('iframe', {
              title: 'HRA Receipt',
              srcDoc: receiptHtml,
              ref: (node: unknown) => {
                receiptFrameRef.current = node as ReceiptFrame | null;
              },
              style: {
                width: '100%',
                height:
                  typeof window !== 'undefined'
                    ? Math.max(760, window.innerHeight - 190)
                    : 820,
                border: 0,
                display: 'block',
                backgroundColor: Colors.surface,
              },
            })}
          </View>
        ) : (
          <Card>
            <Cap>Receipt Ready</Cap>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginTop: 8 }}>
              HRA receipt generated
            </Text>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
              Save or share the PDF from this screen. Full inline preview is available on web.
            </Text>
            <Button
              title={sharingReceipt ? 'Preparing...' : 'Save or Share PDF'}
              onPress={handlePrintOrSave}
              loading={sharingReceipt}
              style={{ marginTop: 18 }}
              fullWidth
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReceiptHeader({
  title,
  onBack,
  onPrint,
  onCopyLink,
  actionDisabled = false,
  printing = false,
}: {
  title: string;
  onBack: () => void;
  onPrint: () => void;
  onCopyLink: () => void;
  actionDisabled?: boolean;
  printing?: boolean;
}) {
  return (
    <View
      style={{
        minHeight: 60,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <BackButton onPress={onBack} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Cap>Tenant</Cap>
        <Text numberOfLines={1} style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17 }}>
          {title}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <HeaderAction
          label={Platform.OS === 'web' ? 'Print / Save PDF' : 'Save PDF'}
          icon="print-outline"
          onPress={onPrint}
          disabled={actionDisabled}
          loading={printing}
        />
        <HeaderAction
          label="Copy Link"
          icon="link-outline"
          onPress={onCopyLink}
          disabled={actionDisabled}
        />
      </ScrollView>
    </View>
  );
}

function HeaderAction({
  label,
  icon,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  icon: AppIconName;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.76}
      style={{
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: disabled || loading ? 0.5 : 1,
      }}
    >
      {loading ? <ActivityIndicator size="small" color={Colors.action} /> : <AppIcon name={icon} size={15} color={Colors.action} />}
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
