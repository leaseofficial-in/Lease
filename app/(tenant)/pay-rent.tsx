import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Rental, RentPayment } from '../../types';
import { formatCurrency, formatMonth, monthKey } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PaymentMethodSelector } from '../../components/payment/PaymentMethodSelector';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { createPaymentOrder, verifyAndRecordPayment } from '../../lib/razorpay';

type PaymentMethod = 'upi' | 'card' | 'netbanking';

export default function PayRentScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [processing, setProcessing] = useState(false);

  const { data: rental, isLoading: loadingRental } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select(`*, property:properties(name)`)
        .eq('tenant_id', profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Rental | null;
    },
    enabled: !!profile?.id,
  });

  const { data: currentPayment, isLoading: loadingPayment } = useQuery({
    queryKey: ['current-payment', rental?.id],
    queryFn: async () => {
      const month = monthKey();
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rental!.id)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data as RentPayment | null;
    },
    enabled: !!rental?.id,
  });

  const totalAmount = (currentPayment?.amount ?? rental?.monthly_rent ?? 0)
    + (currentPayment?.late_fee ?? 0);

  const handlePay = async () => {
    if (!rental || !profile) return;

    setProcessing(true);
    try {
      // Ensure a payment record exists for this month
      let paymentId = currentPayment?.id;
      if (!paymentId) {
        const { data, error } = await supabase
          .from('rent_payments')
          .insert({
            rental_id: rental.id,
            tenant_id: profile.id,
            amount: rental.monthly_rent,
            month: monthKey(),
            status: 'pending',
          })
          .select()
          .single();
        if (error) throw error;
        paymentId = data.id;
      }

      // Create Razorpay order
      const order = await createPaymentOrder(rental.id, paymentId!, totalAmount);

      // In a real app: open Razorpay SDK or WebView here
      // For now, simulate successful payment after 1.5s
      Alert.alert(
        'Razorpay Checkout',
        `Order ${order.orderId} created for ${formatCurrency(totalAmount)}.\n\n(Razorpay SDK would open here. Payment simulated.)`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setProcessing(false) },
          {
            text: 'Simulate Payment',
            onPress: async () => {
              try {
                await verifyAndRecordPayment(paymentId!, {
                  razorpay_order_id: order.orderId,
                  razorpay_payment_id: `pay_sim_${Date.now()}`,
                  razorpay_signature: 'simulated',
                });
                await queryClient.invalidateQueries({ queryKey: ['current-payment'] });
                await queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
                showToast('Payment successful! 🎉', 'success');
                router.back();
              } catch {
                showToast('Payment verification failed', 'error');
              } finally {
                setProcessing(false);
              }
            },
          },
        ],
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Payment failed', 'error');
      setProcessing(false);
    }
  };

  if (loadingRental || loadingPayment) return <LoadingScreen />;

  const isPaid = currentPayment?.status === 'paid';

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View className="px-5 py-4 flex-row items-center bg-white border-b border-border">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <Text className="text-primary">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-primary">Pay Rent</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-8 gap-4">
          {/* Amount card */}
          <Card className="bg-action items-center py-6">
            <Text className="text-white/70 text-sm mb-1">
              {currentPayment ? formatMonth(currentPayment.month) : 'Current Month'}
            </Text>
            <Text className="text-white text-4xl font-bold">
              {formatCurrency(totalAmount)}
            </Text>
            {(currentPayment?.late_fee ?? 0) > 0 && (
              <Text className="text-white/60 text-xs mt-1">
                Includes {formatCurrency(currentPayment!.late_fee)} late fee
              </Text>
            )}
            <Text className="text-white/70 text-sm mt-2">{rental?.property?.name}</Text>
          </Card>

          {isPaid ? (
            <Card className="items-center py-6">
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text className="text-lg font-bold text-success mt-2">Already Paid</Text>
              <Text className="text-sm text-muted">
                This month's rent has been recorded.
              </Text>
            </Card>
          ) : (
            <>
              <View>
                <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                  Payment Method
                </Text>
                <PaymentMethodSelector
                  selected={paymentMethod}
                  onChange={setPaymentMethod}
                />
              </View>

              <Button
                title={`Pay ${formatCurrency(totalAmount)}`}
                onPress={handlePay}
                loading={processing}
                fullWidth
                size="lg"
              />

              <Text className="text-xs text-muted text-center">
                Secured by Razorpay · 256-bit SSL encryption
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
