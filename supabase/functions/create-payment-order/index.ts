import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID     = Deno.env.get('RAZORPAY_KEY_ID')!;
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CreateOrderPayload {
  rentalId: string;
  paymentId: string;
  amount: number; // in INR
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Verify caller is authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload: CreateOrderPayload = await req.json();
    const { rentalId, paymentId, amount } = payload;

    if (!rentalId || !paymentId || !amount || amount < 1) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify rental exists
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('id, monthly_rent')
      .eq('id', rentalId)
      .single();

    if (rentalError || !rental) {
      return new Response(JSON.stringify({ error: 'Rental not found' }), { status: 404 });
    }

    // Create Razorpay order (amount in paise)
    const amountPaise = Math.round(amount * 100);
    const receipt = `flatvio_${paymentId.slice(0, 16)}`;

    const orderBody = {
      amount: amountPaise,
      currency: 'INR',
      receipt,
      payment_capture: 1,
      notes: { rental_id: rentalId, payment_id: paymentId },
    };

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderBody),
    });

    const order = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error('Razorpay error:', order);
      return new Response(JSON.stringify({ error: order.error?.description ?? 'Razorpay error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Store order ID on payment record
    await supabase
      .from('rent_payments')
      .update({ razorpay_order_id: order.id })
      .eq('id', paymentId);

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-payment-order error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
