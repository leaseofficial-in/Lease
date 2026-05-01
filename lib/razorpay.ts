import { supabase } from './supabase';
import { Config } from '../constants/config';

export interface PaymentOrderResponse {
  orderId: string;
  amount: number; // in paise
  currency: string;
  receipt: string;
}

export interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Creates a Razorpay order via the Edge Function
export const createPaymentOrder = async (
  rentalId: string,
  paymentId: string,
  amount: number,
): Promise<PaymentOrderResponse> => {
  const { data, error } = await supabase.functions.invoke('create-payment-order', {
    body: { rentalId, paymentId, amount },
  });

  if (error) throw new Error(`Failed to create payment order: ${error.message}`);
  return data as PaymentOrderResponse;
};

// Razorpay Web SDK checkout options for React Native WebView or in-app browser
export const getRazorpayCheckoutOptions = (
  order: PaymentOrderResponse,
  profile: { full_name: string; phone: string; email: string | null },
  onSuccess: (payment: PaymentVerification) => void,
  onError: (description: string) => void,
) => ({
  key: Config.razorpayKeyId,
  amount: order.amount,
  currency: order.currency,
  order_id: order.orderId,
  name: 'Flatvio',
  description: 'Rent Payment',
  image: 'https://flatvio.in/logo.png',
  prefill: {
    name: profile.full_name,
    contact: profile.phone,
    email: profile.email ?? '',
  },
  theme: { color: '#1A56FF' },
  handler: onSuccess,
  modal: { ondismiss: () => onError('Payment dismissed') },
});

// Verifies payment and marks the rent payment record as paid
export const verifyAndRecordPayment = async (
  paymentId: string,
  verification: PaymentVerification,
): Promise<void> => {
  const { error } = await supabase
    .from('rent_payments')
    .update({
      status: 'paid',
      razorpay_order_id: verification.razorpay_order_id,
      razorpay_payment_id: verification.razorpay_payment_id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) throw new Error(`Failed to record payment: ${error.message}`);
};
