import { supabase } from './supabase';
import { monthKey } from './formatters';
import { RentPayment } from '../types';

// ─── Payment state predicates ─────────────────────────────────────────────────
// Single source of truth for payment status logic used across multiple screens.

export const isPaymentSettled = (payment: RentPayment | null | undefined): boolean =>
  payment?.status === 'paid';

export const isPaymentPendingVerification = (payment: RentPayment | null | undefined): boolean =>
  payment?.status === 'pending_verification';

/** Tenant can initiate payment — not already paid or awaiting landlord confirmation. */
export const canTenantPay = (payment: RentPayment | null | undefined): boolean =>
  !isPaymentSettled(payment) && !isPaymentPendingVerification(payment);

/** Landlord can confirm this payment. */
export const canLandlordConfirm = (payment: RentPayment): boolean =>
  payment.status === 'pending_verification';

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
      // RPC not yet deployed — fall back to direct update with status guard
      const { data: rows, error: updateError } = await supabase
        .from('rent_payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', paymentId)
        .eq('status', 'pending_verification') // idempotency guard
        .select('id');
      if (updateError) throw updateError;
      if (!rows?.length) throw new Error('Payment was already confirmed or not found.');
      return rows[0];
    }
    throw error;
  }

  if (!data) throw new Error('Payment was not confirmed.');
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
    const { error: insertError } = await supabase.from('rent_payments').insert({
      rental_id: rentalId,
      tenant_id: tenantId,
      amount: monthlyRent,
      month: currentMonth,
      status: today > dueDay ? 'overdue' : 'pending',
      late_fee: today > dueDay ? Math.round(monthlyRent * lateFeePercent / 100) : 0,
    });
    // Ignore unique-constraint violations — concurrent call already inserted the record
    if (insertError && !insertError.message.includes('duplicate') && !insertError.message.includes('unique')) {
      throw insertError;
    }
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
