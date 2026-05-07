import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM')!; // e.g. whatsapp:+14155238886
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
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

interface WhatsAppPayload {
  to: string;      // phone number with country code e.g. +919876543210
  templateName: 'rent_reminder' | 'overdue_reminder' | 'payment_received' | 'proof_submitted' | 'invite';
  variables: Record<string, string>;
}

const templates: Record<WhatsAppPayload['templateName'], (v: Record<string, string>) => string> = {
  rent_reminder: (v) =>
    `Hi ${v.name}! 👋\n\nYour rent of *₹${v.amount}* for *${v.month}* is due on the *${v.dueDay}th*.\n\nPay now on RentyBase to avoid late fees: ${v.link}`,
  overdue_reminder: (v) =>
    `Hi ${v.name}, your rent of *₹${v.amount}* for *${v.month}* is *${v.daysOverdue} day${v.daysOverdue === '1' ? '' : 's'} overdue*.\n\nPlease pay as soon as possible to avoid a late fee.\n\nPay now: ${v.link}`,
  payment_received: (v) =>
    `✅ Payment received!\n\nHi ${v.name}, we've received *₹${v.amount}* for *${v.month}*.\n\nYour rent is now marked as paid.`,
  proof_submitted: (v) =>
    `📷 Move-in proof submitted!\n\nHi ${v.landlordName}, your tenant *${v.tenantName}* has uploaded move-in photos.\n\nReview them on RentyBase: ${v.link}`,
  invite: (v) =>
    `🏠 You've been invited to join a rental on RentyBase!\n\nProperty: *${v.propertyName}*\nRent: *₹${v.rent}/month*\n\nJoin here: ${v.link}\n\n_Link expires in 7 days._`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const payload: WhatsAppPayload = await req.json();
    const { to, templateName, variables } = payload;

    if (!to || !templateName || !variables) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const body = templates[templateName](variables);
    const toWhatsapp = `whatsapp:${to.startsWith('+') ? to : `+91${to}`}`;

    const formData = new URLSearchParams();
    formData.set('From', TWILIO_WHATSAPP_FROM);
    formData.set('To', toWhatsapp);
    formData.set('Body', body);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', result);
      return jsonResponse({ error: result.message }, 502);
    }

    return jsonResponse({ sid: result.sid });
  } catch (err) {
    console.error('send-whatsapp error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
