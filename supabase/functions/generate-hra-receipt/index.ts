import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
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

interface HRAPayload {
  paymentId: string;
}

// Generates a plain-text HRA rent receipt
// In production replace with a PDF generation library (e.g. pdfkit)
const toWords = (n: number): string => {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n === 0) return 'Zero';
  if (n < 20) return a[n];
  if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' ' + a[n%10] : '');
  if (n < 1000) return a[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + toWords(n%100) : '');
  if (n < 100000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
  if (n < 10000000) return toWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + toWords(n%100000) : '');
  return toWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + toWords(n%10000000) : '');
};

const buildReceiptHtml = (data: {
  tenantName: string;
  tenantPan?: string;
  landlordName: string;
  landlordPan?: string;
  propertyAddress: string;
  month: string;
  amount: number;
  receiptNo: string;
  paidAt: string;
}): string => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Rent Receipt — ${data.receiptNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; background: #fff; padding: 0; }
  .page { max-width: 680px; margin: 0 auto; padding: 40px 48px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #1a1a1a; margin-bottom: 28px; }
  .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #1a1a1a; }
  .brand span { color: #2E5BFF; }
  .receipt-label { text-align: right; }
  .receipt-label h1 { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #555; }
  .receipt-label .no { font-size: 13px; color: #888; margin-top: 4px; font-family: monospace; }

  /* Amount hero */
  .amount-hero { background: #0A0A0A; border-radius: 16px; padding: 24px 28px; margin-bottom: 28px; color: #fff; display: flex; justify-content: space-between; align-items: center; }
  .amount-hero .amt { font-size: 36px; font-weight: 800; letter-spacing: -1px; }
  .amount-hero .words { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 6px; max-width: 280px; }
  .amount-hero .month-badge { background: rgba(255,255,255,0.12); border-radius: 10px; padding: 10px 16px; text-align: center; }
  .amount-hero .month-badge .ml { font-size: 11px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 1px; }
  .amount-hero .month-badge .mv { font-size: 15px; font-weight: 700; margin-top: 4px; }

  /* Detail table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  tr { border-bottom: 1px solid #eee; }
  tr:last-child { border-bottom: none; }
  td { padding: 11px 0; vertical-align: top; }
  td.lbl { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; width: 36%; padding-right: 12px; padding-top: 13px; }
  td.val { color: #1a1a1a; font-size: 14px; font-weight: 600; }
  td.val .sub { font-size: 12px; color: #888; font-weight: 400; margin-top: 2px; }

  /* Declaration */
  .declaration { background: #f8f9fa; border-left: 3px solid #2E5BFF; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 32px; font-size: 13px; color: #555; line-height: 1.6; }

  /* Signature */
  .sig-row { display: flex; justify-content: space-between; margin-bottom: 28px; }
  .sig-box { width: 46%; }
  .sig-line { border-bottom: 1px solid #aaa; margin-bottom: 8px; height: 40px; }
  .sig-name { font-size: 13px; font-weight: 700; color: #1a1a1a; }
  .sig-role { font-size: 11px; color: #888; margin-top: 2px; }

  /* Footer */
  .footer { border-top: 1px solid #eee; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
  .footer .brand-sm { font-size: 13px; font-weight: 700; color: #1a1a1a; }
  .footer .brand-sm span { color: #2E5BFF; }
  .footer .note { font-size: 11px; color: #aaa; text-align: right; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 32px; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">flat<span>vio</span></div>
    <div class="receipt-label">
      <h1>Rent Receipt</h1>
      <div class="no">${data.receiptNo}</div>
    </div>
  </div>

  <div class="amount-hero">
    <div>
      <div class="amt">₹${data.amount.toLocaleString('en-IN')}</div>
      <div class="words">${toWords(data.amount)} Rupees Only</div>
    </div>
    <div class="month-badge">
      <div class="ml">For</div>
      <div class="mv">${data.month}</div>
    </div>
  </div>

  <table>
    <tr>
      <td class="lbl">Received From</td>
      <td class="val">
        ${data.tenantName}
        ${data.tenantPan ? `<div class="sub">PAN: ${data.tenantPan}</div>` : ''}
      </td>
    </tr>
    <tr>
      <td class="lbl">Paid To</td>
      <td class="val">
        ${data.landlordName}
        ${data.landlordPan ? `<div class="sub">PAN: ${data.landlordPan}</div>` : ''}
      </td>
    </tr>
    <tr>
      <td class="lbl">Property</td>
      <td class="val">${data.propertyAddress}</td>
    </tr>
    <tr>
      <td class="lbl">Payment Date</td>
      <td class="val">${data.paidAt}</td>
    </tr>
    <tr>
      <td class="lbl">Amount</td>
      <td class="val">₹${data.amount.toLocaleString('en-IN')}</td>
    </tr>
  </table>

  <div class="declaration">
    I, <strong>${data.landlordName}</strong>, hereby acknowledge receipt of <strong>₹${data.amount.toLocaleString('en-IN')}</strong> (${toWords(data.amount)} Rupees Only) from <strong>${data.tenantName}</strong> as rent for the above property for the month of <strong>${data.month}</strong>.
  </div>

  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-name">${data.landlordName}</div>
      <div class="sig-role">Landlord Signature</div>
    </div>
    <div class="sig-box" style="text-align:right">
      <div class="sig-line"></div>
      <div class="sig-name">${data.tenantName}</div>
      <div class="sig-role">Tenant Acknowledgement</div>
    </div>
  </div>

  <div class="footer">
    <div class="brand-sm">flat<span>vio</span> · flatvio.in</div>
    <div class="note">Computer-generated receipt · ${data.receiptNo}<br>Valid for HRA exemption under Income Tax Act</div>
  </div>
</div>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { paymentId }: HRAPayload = await req.json();

    if (!paymentId) {
      return jsonResponse({ error: 'paymentId required' }, 400);
    }

    // Fetch payment with joined rental and profiles
    const { data: payment, error } = await supabase
      .from('rent_payments')
      .select(`
        *,
        rental:rentals(
          *,
          property:properties(*),
          landlord:profiles!rentals_landlord_id_fkey(*),
          tenant:profiles!rentals_tenant_id_fkey(*)
        )
      `)
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return jsonResponse({ error: 'Payment not found' }, 404);
    }

    if (payment.status !== 'paid') {
      return jsonResponse({ error: 'Payment not yet confirmed' }, 422);
    }

    const { rental } = payment as typeof payment & {
      rental: {
        property: { name: string; address_line1: string; city: string; state: string };
        landlord: { full_name: string; pan_number?: string };
        tenant: { full_name: string; pan_number?: string };
      };
    };

    const receiptNo = `FLV-${payment.id.slice(0, 8).toUpperCase()}`;
    const month = new Date(payment.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const paidAt = new Date(payment.paid_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const address = `${rental.property.name}, ${rental.property.address_line1}, ${rental.property.city}, ${rental.property.state}`;

    const html = buildReceiptHtml({
      tenantName: rental.tenant.full_name,
      tenantPan: rental.tenant.pan_number,
      landlordName: rental.landlord.full_name,
      landlordPan: rental.landlord.pan_number,
      propertyAddress: address,
      month,
      amount: payment.amount,
      receiptNo,
      paidAt,
    });

    // Store HTML as receipt in storage
    const fileName = `receipts/${payment.rental_id}/${payment.id}.html`;
    const { error: uploadError } = await supabase.storage
      .from('agreements')
      .upload(fileName, new Blob([html], { type: 'text/html; charset=utf-8' }), {
        contentType: 'text/html; charset=utf-8',
        upsert: true,
      });

    if (uploadError) {
      console.error('Receipt upload error:', uploadError);
    } else {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('agreements')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return jsonResponse({ error: 'Failed to prepare receipt link' }, 500);
    }

    await supabase
      .from('rent_payments')
      .update({ receipt_url: signedUrlData.signedUrl })
      .eq('id', paymentId);
    }

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  } catch (err) {
    console.error('generate-hra-receipt error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
