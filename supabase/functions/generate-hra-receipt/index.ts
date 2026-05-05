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

const escapeHtml = (value: string | number | null | undefined): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatInr = (amount: number): string =>
  `&#8377; ${Number(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  })}`;

const formatPaymentMethod = (method?: string | null): string => {
  if (method === 'upi') return 'UPI';
  if (method === 'cash') return 'Cash';
  return 'Recorded in Flatvio';
};

const detailRow = (label: string, value?: string | null, subValue?: string | null): string => {
  if (!value && !subValue) return '';
  return `
    <tr>
      <th>${escapeHtml(label)}</th>
      <td>
        ${escapeHtml(value)}
        ${subValue ? `<div class="sub">${escapeHtml(subValue)}</div>` : ''}
      </td>
    </tr>`;
};

const buildReceiptHtml = (data: {
  tenantName: string;
  tenantPan?: string;
  landlordName: string;
  landlordPan?: string;
  propertyAddress: string;
  month: string;
  amount: number;
  lateFee?: number;
  receiptNo: string;
  paidAt: string;
  generatedAt: string;
  paymentMethod?: string | null;
  transactionReference?: string | null;
}): string => {
  const rentAmount = Math.max(data.amount - (data.lateFee ?? 0), 0);
  const amountWords = `${toWords(Math.round(data.amount))} Rupees Only`;
  const tenantPan = data.tenantPan ? `PAN: ${data.tenantPan}` : null;
  const landlordPan = data.landlordPan ? `PAN: ${data.landlordPan}` : null;
  const paymentMethod = formatPaymentMethod(data.paymentMethod);

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rent Receipt - ${data.receiptNo}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #17202a;
    background: #f4f6f8;
    font-size: 12px;
    line-height: 1.45;
  }
  .sheet {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #fff;
    padding: 22mm 20mm 18mm;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #17202a;
  }
  .brand { font-size: 23px; font-weight: 800; letter-spacing: 0; color: #17202a; }
  .brand span { color: #2454d6; }
  .brand-sub { margin-top: 3px; color: #657083; font-size: 11px; }
  .receipt-meta { text-align: right; min-width: 210px; }
  h1 { margin: 0; font-size: 18px; line-height: 1.2; letter-spacing: 1.8px; text-transform: uppercase; color: #17202a; }
  .meta-line { margin-top: 6px; color: #657083; font-size: 11px; }
  .meta-line strong { color: #17202a; font-weight: 700; }
  .summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1px solid #d8dee8;
    margin-top: 18px;
  }
  .summary-cell { padding: 14px 16px; border-right: 1px solid #d8dee8; }
  .summary-cell:last-child { border-right: 0; }
  .label {
    color: #657083;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }
  .amount { margin-top: 5px; font-size: 25px; line-height: 1.15; font-weight: 800; color: #17202a; }
  .period { margin-top: 6px; font-size: 16px; font-weight: 700; color: #17202a; }
  .words { margin-top: 4px; color: #657083; font-size: 11px; }
  .section { margin-top: 18px; }
  .section-title {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #17202a;
    margin-bottom: 8px;
  }
  table { width: 100%; border-collapse: collapse; border: 1px solid #d8dee8; }
  th, td { padding: 9px 12px; border-bottom: 1px solid #e7ebf0; vertical-align: top; text-align: left; }
  tr:last-child th, tr:last-child td { border-bottom: 0; }
  th { width: 34%; background: #f8fafc; color: #657083; font-size: 10px; font-weight: 800; letter-spacing: 0.7px; text-transform: uppercase; }
  td { color: #17202a; font-size: 12px; font-weight: 700; }
  .sub { color: #657083; font-size: 11px; font-weight: 400; margin-top: 2px; }
  .breakdown td, .breakdown th { padding: 8px 12px; }
  .breakdown .total th, .breakdown .total td { border-top: 2px solid #17202a; font-size: 13px; color: #17202a; }
  .text-right { text-align: right; }
  .declaration {
    margin-top: 18px;
    border: 1px solid #d8dee8;
    background: #fbfcfe;
    padding: 12px 14px;
    color: #303a46;
    font-size: 12px;
    line-height: 1.6;
  }
  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin-top: 36px;
  }
  .sig-line { border-bottom: 1px solid #657083; height: 34px; margin-bottom: 8px; }
  .sig-name { color: #17202a; font-weight: 700; font-size: 12px; }
  .sig-role { color: #657083; font-size: 10px; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.6px; }
  .notes {
    margin-top: 22px;
    padding-top: 12px;
    border-top: 1px solid #d8dee8;
    color: #657083;
    font-size: 10px;
  }
  .footer {
    margin-top: 16px;
    display: flex;
    justify-content: space-between;
    gap: 18px;
    color: #657083;
    font-size: 10px;
  }
  .footer strong { color: #17202a; }

  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { width: auto; min-height: auto; margin: 0; padding: 0; }
  }

  @media screen and (max-width: 780px) {
    body { background: #fff; }
    .sheet { width: 100%; min-height: auto; padding: 24px 18px; }
    .topbar, .summary, .signature-grid, .footer { grid-template-columns: 1fr; flex-direction: column; }
    .receipt-meta { text-align: left; min-width: 0; }
    .summary-cell { border-right: 0; border-bottom: 1px solid #d8dee8; }
    .summary-cell:last-child { border-bottom: 0; }
  }
</style>
</head>
<body>
<main class="sheet">
  <header class="topbar">
    <div>
      <div class="brand">flat<span>vio</span></div>
      <div class="brand-sub">Digital rent records and rental compliance</div>
    </div>
    <div class="receipt-meta">
      <h1>Rent Receipt</h1>
      <div class="meta-line"><strong>Receipt No:</strong> ${escapeHtml(data.receiptNo)}</div>
      <div class="meta-line"><strong>Issued On:</strong> ${escapeHtml(data.generatedAt)}</div>
    </div>
  </header>

  <section class="summary" aria-label="Receipt summary">
    <div class="summary-cell">
      <div class="label">Amount Received</div>
      <div class="amount">${formatInr(data.amount)}</div>
      <div class="words">${escapeHtml(amountWords)}</div>
    </div>
    <div class="summary-cell">
      <div class="label">Rent Period</div>
      <div class="period">${escapeHtml(data.month)}</div>
      <div class="words">Payment date: ${escapeHtml(data.paidAt)}</div>
    </div>
  </section>

  <section class="section">
    <div class="section-title">Parties and Property</div>
    <table>
      ${detailRow('Received From', data.tenantName, tenantPan)}
      ${detailRow('Received By', data.landlordName, landlordPan)}
      ${detailRow('Rented Property', data.propertyAddress)}
    </table>
  </section>

  <section class="section">
    <div class="section-title">Payment Details</div>
    <table>
      ${detailRow('Payment Method', paymentMethod, data.transactionReference ? `Reference: ${data.transactionReference}` : null)}
      ${detailRow('Payment Date', data.paidAt)}
      ${detailRow('Rent Month', data.month)}
    </table>
  </section>

  <section class="section">
    <div class="section-title">Amount Breakdown</div>
    <table class="breakdown">
      <tr>
        <th>Monthly Rent</th>
        <td class="text-right">${formatInr(rentAmount)}</td>
      </tr>
      ${(data.lateFee ?? 0) > 0 ? `
      <tr>
        <th>Late Fee / Other Charges</th>
        <td class="text-right">${formatInr(data.lateFee ?? 0)}</td>
      </tr>` : ''}
      <tr class="total">
        <th>Total Received</th>
        <td class="text-right">${formatInr(data.amount)}</td>
      </tr>
    </table>
  </section>

  <section class="declaration">
    I, <strong>${escapeHtml(data.landlordName)}</strong>, acknowledge receipt of <strong>${formatInr(data.amount)}</strong>
    (${escapeHtml(amountWords)}) from <strong>${escapeHtml(data.tenantName)}</strong> towards rent for
    <strong>${escapeHtml(data.propertyAddress)}</strong> for the month of <strong>${escapeHtml(data.month)}</strong>.
  </section>

  <section class="signature-grid">
    <div>
      <div class="sig-line"></div>
      <div class="sig-name">${escapeHtml(data.landlordName)}</div>
      <div class="sig-role">Landlord Signature</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-name">${escapeHtml(data.tenantName)}</div>
      <div class="sig-role">Tenant Acknowledgement</div>
    </div>
  </section>

  <section class="notes">
    This is a computer-generated rent receipt from Flatvio based on the payment confirmation recorded by the landlord.
    Please retain it with your rent records for HRA or reimbursement claims, subject to your employer or tax advisor's requirements.
  </section>

  <footer class="footer">
    <div><strong>flatvio.in</strong></div>
    <div>Receipt ID: ${escapeHtml(data.receiptNo)}</div>
  </footer>
</main>
</body>
</html>
`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return jsonResponse({ error: 'Authentication required' }, 401);
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Invalid session' }, 401);
    }

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
        landlord_id: string;
        tenant_id: string | null;
        property: {
          name: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          pincode?: string | null;
        };
        landlord: { full_name: string; pan_number?: string };
        tenant: { full_name: string; pan_number?: string };
      };
    };

    if (authData.user.id !== rental.landlord_id && authData.user.id !== rental.tenant_id) {
      return jsonResponse({ error: 'You do not have access to this receipt' }, 403);
    }

    const receiptNo = `FLV-${payment.id.slice(0, 8).toUpperCase()}`;
    const month = new Date(payment.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const paidAt = new Date(payment.paid_at ?? payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const generatedAt = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const address = [
      rental.property.name,
      rental.property.address_line1,
      rental.property.address_line2,
      rental.property.city,
      rental.property.state,
      rental.property.pincode,
    ].filter(Boolean).join(', ');

    const html = buildReceiptHtml({
      tenantName: rental.tenant.full_name,
      tenantPan: rental.tenant.pan_number,
      landlordName: rental.landlord.full_name,
      landlordPan: rental.landlord.pan_number,
      propertyAddress: address,
      month,
      amount: payment.amount,
      lateFee: payment.late_fee,
      receiptNo,
      paidAt,
      generatedAt,
      paymentMethod: payment.payment_method,
      transactionReference: payment.utr_number ?? payment.razorpay_payment_id,
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
