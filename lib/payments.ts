import { supabase } from './supabase';
import { monthKey } from './formatters';

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

// Client-side fallback for when process-rent Edge Function isn't deployed.
// Call on tenant dashboard mount — safe to call every time (idempotent).
export async function checkAndMarkOverdue(
  rentalId: string,
  tenantId: string,
  rentDueDay: number,
  monthlyRent: number,
  lateFeePercent: number,
): Promise<void> {
  const today = new Date().getDate();
  const dueDay = Math.min(rentDueDay, 28);
  const currentMonth = monthKey();

  const { data: payment } = await supabase
    .from('rent_payments')
    .select('id, status, amount')
    .eq('rental_id', rentalId)
    .eq('month', currentMonth)
    .maybeSingle();

  if (!payment) {
    await supabase.from('rent_payments').insert({
      rental_id: rentalId,
      tenant_id: tenantId,
      amount: monthlyRent,
      month: currentMonth,
      status: today > dueDay ? 'overdue' : 'pending',
      late_fee: today > dueDay ? Math.round(monthlyRent * lateFeePercent / 100) : 0,
    });
    return;
  }

  if (payment.status === 'pending' && today > dueDay) {
    const lateFee = Math.round(payment.amount * lateFeePercent / 100);
    await supabase
      .from('rent_payments')
      .update({ status: 'overdue', late_fee: lateFee })
      .eq('id', payment.id);
  }
}
