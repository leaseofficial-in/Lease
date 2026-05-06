import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID     = Deno.env.get('RAZORPAY_KEY_ID')!;
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface CreateOrderPayload {
  rentalId: string;
  paymentId: string;
  amount: number; // in INR
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // Verify caller is authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload: CreateOrderPayload = await req.json();
    const { rentalId, paymentId, amount } = payload;

    if (!rentalId || !paymentId || !amount || amount < 1) {
      return jsonResponse({ error: 'Invalid payload' }, 400);
    }

    // Verify rental exists
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('id, monthly_rent')
      .eq('id', rentalId)
      .single();

    if (rentalError || !rental) {
      return jsonResponse({ error: 'Rental not found' }, 404);
    }

    // Create Razorpay order (amount in paise)
    const amountPaise = Math.round(amount * 100);
    const receipt = `rentybase_${paymentId.slice(0, 16)}`;

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
      return jsonResponse({ error: order.error?.description ?? 'Razorpay error' }, 502);
    }

    // Store order ID on payment record
    await supabase
      .from('rent_payments')
      .update({ razorpay_order_id: order.id })
      .eq('id', paymentId);

    return jsonResponse({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (err) {
    console.error('create-payment-order error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
