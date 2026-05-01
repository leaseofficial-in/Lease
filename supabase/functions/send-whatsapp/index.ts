import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM')!; // e.g. whatsapp:+14155238886
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface WhatsAppPayload {
  to: string;      // phone number with country code e.g. +919876543210
  templateName: 'rent_reminder' | 'payment_received' | 'proof_submitted' | 'invite';
  variables: Record<string, string>;
}

const templates: Record<WhatsAppPayload['templateName'], (v: Record<string, string>) => string> = {
  rent_reminder: (v) =>
    `Hi ${v.name}! 👋\n\nYour rent of *₹${v.amount}* for *${v.month}* is due on the *${v.dueDay}th*.\n\nPay now on Flatvio to avoid late fees: ${v.link}`,
  payment_received: (v) =>
    `✅ Payment received!\n\nHi ${v.name}, we've received *₹${v.amount}* for *${v.month}*.\n\nYour rent is now marked as paid.`,
  proof_submitted: (v) =>
    `📷 Move-in proof submitted!\n\nHi ${v.landlordName}, your tenant *${v.tenantName}* has uploaded move-in photos.\n\nReview them on Flatvio: ${v.link}`,
  invite: (v) =>
    `🏠 You've been invited to join a rental on Flatvio!\n\nProperty: *${v.propertyName}*\nRent: *₹${v.rent}/month*\n\nJoin here: ${v.link}\n\n_Link expires in 72 hours._`,
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const payload: WhatsAppPayload = await req.json();
    const { to, templateName, variables } = payload;

    if (!to || !templateName || !variables) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: result.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sid: result.sid }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-whatsapp error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
