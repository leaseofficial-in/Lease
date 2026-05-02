import { supabase } from './supabase';

type SupabaseRpcError = {
  code?: string;
  message?: string;
};

const isMissingConfirmPaymentRpc = (error: SupabaseRpcError) =>
  error.code === 'PGRST202' || error.message?.includes('confirm_rent_payment');

export async function confirmRentPayment(paymentId: string) {
  const { data, error } = await supabase.rpc('confirm_rent_payment', {
    payment_id: paymentId,
  });

  if (error) {
    if (isMissingConfirmPaymentRpc(error)) {
      throw new Error('Payment confirmation is not ready yet. Apply Supabase migration 006, then try again.');
    }
    throw error;
  }

  if (!data) {
    throw new Error('Payment was not confirmed.');
  }

  return data;
}
