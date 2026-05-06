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

// Helpers

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtCurrency(n: number): string {
  return `Rs ${n.toLocaleString('en-IN')}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// Indian number system words
function inWords(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function hundreds(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + hundreds(n % 100) : '');
  }

  const n = Math.round(amount);
  if (n === 0) return 'Zero';
  const cr = Math.floor(n / 10_000_000);
  const lk = Math.floor((n % 10_000_000) / 100_000);
  const th = Math.floor((n % 100_000) / 1_000);
  const re = n % 1_000;

  return [
    cr ? hundreds(cr) + ' Crore' : '',
    lk ? hundreds(lk) + ' Lakh' : '',
    th ? hundreds(th) + ' Thousand' : '',
    re ? hundreds(re) : '',
  ].filter(Boolean).join(' ');
}

// Add N months to a date string, return formatted date
function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1);
  return fmtDate(d.toISOString());
}

// HTML template

function buildAgreementHtml(p: {
  refNo: string;
  generatedOn: string;
  city: string;
  state: string;
  landlordName: string;
  landlordPan: string;
  tenantName: string;
  tenantAadhaarLast4: string | null;
  propertyName: string;
  address: string;
  propertyType: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  rentDueDay: number;
  agreementSigned: boolean;
  tenantSignedAt: string | null;
}): string {
  const rentWords = inWords(p.monthlyRent);
  const depositWords = inWords(p.securityDeposit);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Leave and License Agreement - ${p.refNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 13.5px;
    line-height: 1.75;
    color: #111;
    background: #fff;
    max-width: 780px;
    margin: 0 auto;
    padding: 48px 56px 72px;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
  .header {
    text-align: center;
    border-bottom: 2.5px solid #111;
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  .badge {
    display: inline-block;
    font-family: Arial, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 10px;
  }
  h1 {
    font-size: 22px;
    font-weight: normal;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .ref {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: #666;
    margin-top: 6px;
  }
  .preamble {
    margin-bottom: 24px;
    font-size: 13.5px;
  }
  .party-block {
    margin: 18px 0;
    padding: 14px 18px;
    border-left: 3px solid #111;
    background: #fafafa;
  }
  .party-label {
    font-family: Arial, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 4px;
  }
  .party-name {
    font-size: 16px;
    font-weight: bold;
  }
  .party-detail {
    font-size: 12.5px;
    color: #444;
    margin-top: 2px;
  }
  .whereas {
    margin: 20px 0;
    font-style: italic;
    color: #333;
  }
  .schedule-box {
    border: 1.5px solid #ddd;
    border-radius: 4px;
    padding: 16px 20px;
    margin: 20px 0 28px;
    background: #f9f9f9;
  }
  .schedule-title {
    font-family: Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #444;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #ddd;
  }
  .schedule-row {
    display: flex;
    gap: 12px;
    padding: 5px 0;
    border-bottom: 1px solid #eee;
    font-size: 13px;
  }
  .schedule-row:last-child { border-bottom: none; }
  .schedule-key {
    font-family: Arial, sans-serif;
    font-weight: 600;
    font-size: 11.5px;
    color: #555;
    min-width: 160px;
    padding-top: 1px;
  }
  .schedule-val { flex: 1; }
  .terms-title {
    font-family: Arial, sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    text-align: center;
    margin: 32px 0 20px;
    padding: 10px 0;
    border-top: 1.5px solid #111;
    border-bottom: 1.5px solid #111;
  }
  .clause {
    margin-bottom: 20px;
  }
  .clause-heading {
    font-family: Arial, sans-serif;
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .clause-num {
    font-weight: bold;
    margin-right: 6px;
  }
  .sub-clause {
    margin: 4px 0 4px 20px;
    font-size: 13px;
  }
  .highlight-box {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 12px 16px;
    margin: 16px 0;
    font-size: 13px;
  }
  .signature-section {
    margin-top: 48px;
    page-break-inside: avoid;
  }
  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-bottom: 40px;
  }
  .sig-block { padding-top: 4px; }
  .sig-label {
    font-family: Arial, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 4px;
  }
  .sig-name { font-size: 15px; font-weight: bold; margin-bottom: 40px; }
  .sig-line {
    border-top: 1px solid #111;
    margin-bottom: 6px;
  }
  .sig-meta { font-size: 11.5px; color: #555; }
  .witness-section { margin-top: 32px; }
  .witness-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-bottom: 24px;
  }
  .witness-field {
    border-bottom: 1px solid #aaa;
    min-height: 28px;
    margin-bottom: 4px;
  }
  .witness-label { font-size: 11px; color: #777; }
  .footer {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid #ddd;
    font-family: Arial, sans-serif;
    font-size: 10.5px;
    color: #888;
    text-align: center;
    line-height: 1.6;
  }
  .signed-stamp {
    display: inline-block;
    border: 2px solid #0a7a45;
    color: #0a7a45;
    font-family: Arial, sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 3px;
    margin-top: 8px;
  }
  .print-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #111;
    color: #fff;
    border: none;
    padding: 10px 20px;
    font-family: Arial, sans-serif;
    font-size: 13px;
    border-radius: 6px;
    cursor: pointer;
    z-index: 100;
  }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

<div class="header">
  <div class="badge">RentyBase - Rental Management Platform</div>
  <h1>Leave and License Agreement</h1>
  <div class="ref">Ref: ${p.refNo} &nbsp;-&nbsp; Generated: ${p.generatedOn}</div>
</div>

<p class="preamble">
  This Leave and License Agreement (<strong>"Agreement"</strong>) is executed at <strong>${p.city}, ${p.state}</strong>,
  on <strong>${p.generatedOn}</strong>,
</p>

<div class="party-block">
  <div class="party-label">Licensor (Landlord)</div>
  <div class="party-name">${p.landlordName}</div>
  <div class="party-detail">PAN: ${p.landlordPan || 'Not furnished'}</div>
  <div class="party-detail" style="margin-top:4px; font-size:12px; color:#666">
    (hereinafter referred to as the <strong>"Licensor"</strong>, which expression shall include their heirs, executors, administrators, and assigns)
  </div>
</div>

<p style="text-align:center; font-weight:bold; margin: 8px 0;">AND</p>

<div class="party-block">
  <div class="party-label">Licensee (Tenant)</div>
  <div class="party-name">${p.tenantName}</div>
  ${p.tenantAadhaarLast4 ? `<div class="party-detail">Aadhaar: XXXX XXXX ${p.tenantAadhaarLast4}</div>` : ''}
  <div class="party-detail" style="margin-top:4px; font-size:12px; color:#666">
    (hereinafter referred to as the <strong>"Licensee"</strong>, which expression shall include their heirs, executors, administrators, and assigns)
  </div>
</div>

<div class="whereas">
  <p>WHEREAS the Licensor is the lawful owner / authorised occupant of the premises described hereunder (<strong>"Licensed Premises"</strong>);</p>
  <p style="margin-top:8px">WHEREAS the Licensee has requested permission to use and occupy the Licensed Premises for residential purposes only;</p>
  <p style="margin-top:8px">WHEREAS the Licensor has agreed to grant such permission strictly on the terms and conditions set forth in this Agreement;</p>
  <p style="margin-top:8px">NOW, THEREFORE, in consideration of the mutual covenants herein and other good and valuable consideration, the parties agree as follows:</p>
</div>

<div class="schedule-box">
  <div class="schedule-title">Schedule of Licensed Premises</div>
  <div class="schedule-row"><span class="schedule-key">Property Name</span><span class="schedule-val">${p.propertyName}</span></div>
  <div class="schedule-row"><span class="schedule-key">Address</span><span class="schedule-val">${p.address}</span></div>
  <div class="schedule-row"><span class="schedule-key">Property Type</span><span class="schedule-val">${p.propertyType}</span></div>
  <div class="schedule-row"><span class="schedule-key">License Period</span><span class="schedule-val">${p.startDate} to ${p.endDate} (11 months)</span></div>
  <div class="schedule-row"><span class="schedule-key">Monthly License Fee</span><span class="schedule-val">${fmtCurrency(p.monthlyRent)} (Rupees ${rentWords} only)</span></div>
  <div class="schedule-row"><span class="schedule-key">Security Deposit</span><span class="schedule-val">${fmtCurrency(p.securityDeposit)} (Rupees ${depositWords} only)</span></div>
  <div class="schedule-row"><span class="schedule-key">Fee Due Date</span><span class="schedule-val">${ordinal(p.rentDueDay)} of each calendar month</span></div>
</div>

<div class="terms-title">Terms and Conditions</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">1.</span>Grant of License</div>
  <p class="sub-clause">1.1 The Licensor hereby grants a bare license - and expressly <em>not</em> a lease or tenancy - to the Licensee to use and occupy the Licensed Premises for residential purposes only.</p>
  <p class="sub-clause">1.2 This Agreement shall not be construed as creating any tenancy rights, right of renewal, or any other interest in the Licensed Premises in favour of the Licensee. The Licensee is a licensee and not a tenant.</p>
  <p class="sub-clause">1.3 The Licensee acknowledges and agrees that they have no right, title, or interest in the Licensed Premises other than the limited right to use and occupy as a bare licensee under this Agreement.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">2.</span>License Period</div>
  <p class="sub-clause">2.1 This Agreement commences on <strong>${p.startDate}</strong> and expires on <strong>${p.endDate}</strong> (a period of 11 months).</p>
  <p class="sub-clause">2.2 The Licensee shall vacate the Licensed Premises on or before the expiry date. Holding over after expiry without written renewal shall be deemed a trespass.</p>
  <p class="sub-clause">2.3 Renewal, if agreed, shall be by a fresh written agreement at such terms as the parties may mutually agree.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">3.</span>License Fee</div>
  <p class="sub-clause">3.1 The Licensee shall pay the Licensor a monthly license fee of <strong>${fmtCurrency(p.monthlyRent)}/- (Rupees ${rentWords} only)</strong>.</p>
  <p class="sub-clause">3.2 The license fee is due and payable on or before the <strong>${ordinal(p.rentDueDay)} day</strong> of each calendar month, without demand.</p>
  <p class="sub-clause">3.3 Payment shall be made by UPI transfer, bank transfer, or cash. UPI and bank transfers shall constitute good payment on the date of credit to the Licensor's account.</p>
  <p class="sub-clause">3.4 A late fee of <strong>Rs 500/-</strong> per month (or part thereof) shall be charged if the license fee is not paid within 5 days of the due date.</p>
  <p class="sub-clause">3.5 Non-payment of license fee for 2 (two) consecutive months shall entitle the Licensor to terminate this Agreement forthwith without notice.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">4.</span>Security Deposit</div>
  <p class="sub-clause">4.1 The Licensee has deposited a refundable security deposit of <strong>${fmtCurrency(p.securityDeposit)}/- (Rupees ${depositWords} only)</strong> with the Licensor.</p>
  <p class="sub-clause">4.2 The security deposit shall carry no interest and is held as security for due performance of the Licensee's obligations.</p>
  <p class="sub-clause">4.3 The deposit shall be refunded within <strong>30 days</strong> of the Licensee vacating the premises and surrendering possession, after deducting:</p>
  <p class="sub-clause" style="margin-left:36px">(a) Any outstanding license fee, utility dues, or other amounts payable by the Licensee;</p>
  <p class="sub-clause" style="margin-left:36px">(b) Cost of repairing damages to the property beyond normal wear and tear;</p>
  <p class="sub-clause" style="margin-left:36px">(c) Cost of replacing missing or damaged fixtures, fittings, or items provided by the Licensor.</p>
  <p class="sub-clause">4.4 The Licensor shall provide an itemised deduction statement at the time of refund settlement.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">5.</span>Utilities and Outgoings</div>
  <p class="sub-clause">5.1 The Licensee shall be solely responsible for and shall pay directly all electricity, water, internet, cable TV, LPG, and any other utility charges in respect of the Licensed Premises.</p>
  <p class="sub-clause">5.2 Society maintenance charges, if any, shall be paid by the Licensor unless otherwise agreed in writing.</p>
  <p class="sub-clause">5.3 The Licensee shall ensure timely payment of utility bills and shall indemnify the Licensor against any dues, penalties, or disconnections arising from non-payment.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">6.</span>Maintenance and Repairs</div>
  <p class="sub-clause">6.1 The Licensee shall maintain the Licensed Premises in a clean, hygienic, and good condition, ordinary wear and tear excepted.</p>
  <p class="sub-clause">6.2 Minor repairs costing up to <strong>Rs 500/-</strong> per incident (blocked drains, fused bulbs, broken door handles, etc.) shall be the Licensee's responsibility.</p>
  <p class="sub-clause">6.3 Major structural repairs and repairs to existing plumbing, electrical wiring, or fixtures costing above Rs 500/- shall be the Licensor's responsibility, provided the Licensee reports the defect promptly in writing.</p>
  <p class="sub-clause">6.4 Damage caused by the Licensee's negligence or misuse shall be repaired at the Licensee's cost, irrespective of the amount.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">7.</span>Restrictions on Use</div>
  <p class="sub-clause">7.1 The Licensed Premises shall be used for <strong>residential purposes only</strong>. No commercial activity, business, trade, or profession shall be carried on from the premises.</p>
  <p class="sub-clause">7.2 The Licensee shall not sub-license, sub-let, assign, or part with possession of the Licensed Premises or any part thereof to any person without prior written consent of the Licensor.</p>
  <p class="sub-clause">7.3 The number of occupants shall not exceed what is reasonable for the size of the premises. Overnight guests beyond 7 consecutive nights require prior intimation to the Licensor.</p>
  <p class="sub-clause">7.4 The Licensee shall not carry on any unlawful, immoral, or antisocial activity on or from the premises, nor cause nuisance to neighbours.</p>
  <p class="sub-clause">7.5 No pets shall be kept on the premises without prior written consent of the Licensor.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">8.</span>Alterations and Additions</div>
  <p class="sub-clause">8.1 The Licensee shall not make any structural alterations, additions, or improvements to the Licensed Premises without prior written consent of the Licensor.</p>
  <p class="sub-clause">8.2 Any permitted alterations shall, at the Licensor's option, either be removed by the Licensee before vacating (restoring the premises to original condition) or become the Licensor's property without compensation.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">9.</span>Inspection Rights</div>
  <p class="sub-clause">9.1 The Licensor or their authorised representative may inspect the Licensed Premises at any reasonable time after giving <strong>24 hours' prior notice</strong> to the Licensee.</p>
  <p class="sub-clause">9.2 In case of emergency (fire, water leak, structural risk, etc.), the Licensor may enter without prior notice.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">10.</span>Termination</div>
  <p class="sub-clause">10.1 Either party may terminate this Agreement before the expiry date by giving <strong>one calendar month's written notice</strong> to the other party.</p>
  <p class="sub-clause">10.2 The Licensor may terminate immediately and without notice if the Licensee:</p>
  <p class="sub-clause" style="margin-left:36px">(a) Fails to pay license fee for 2 or more consecutive months;</p>
  <p class="sub-clause" style="margin-left:36px">(b) Causes material damage to the property;</p>
  <p class="sub-clause" style="margin-left:36px">(c) Uses the premises for unlawful purposes; or</p>
  <p class="sub-clause" style="margin-left:36px">(d) Breaches any term of this Agreement and fails to remedy it within 7 days of notice.</p>
  <p class="sub-clause">10.3 On termination or expiry, the Licensee shall immediately deliver vacant and peaceful possession of the Licensed Premises to the Licensor.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">11.</span>Vacation and Handover</div>
  <p class="sub-clause">11.1 On vacating, the Licensee shall return all keys, access cards, remotes, and other items provided at move-in.</p>
  <p class="sub-clause">11.2 The Licensee shall remove all personal belongings. Items left behind for more than 7 days after vacation may be disposed of by the Licensor.</p>
  <p class="sub-clause">11.3 A joint move-out inspection shall be conducted, and move-out photographs shall be recorded on the RentyBase platform as documentary evidence of the property's condition.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">12.</span>Move-in Documentation</div>
  <p class="sub-clause">12.1 The Licensee acknowledges having inspected the Licensed Premises and accepted it in its present condition prior to taking occupation.</p>
  <p class="sub-clause">12.2 Move-in photographs documenting the room-wise condition of the premises have been recorded and time-stamped on the RentyBase platform and form part of this Agreement by reference.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">13.</span>Indemnity</div>
  <p class="sub-clause">13.1 The Licensee shall indemnify and hold harmless the Licensor from and against all claims, losses, damages, or liabilities arising from the Licensee's use of the Licensed Premises or breach of any term of this Agreement.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">14.</span>Nature of Agreement</div>
  <div class="highlight-box">
    This Agreement creates a <strong>bare license</strong> and expressly does NOT create a tenancy, lease, or any other interest in immovable property. The Licensee has no protection under any Rent Control legislation. The Licensor retains full ownership and the right to recover possession on expiry or earlier termination of this Agreement.
  </div>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">15.</span>Governing Law and Jurisdiction</div>
  <p class="sub-clause">15.1 This Agreement shall be governed by and construed in accordance with the laws of the Republic of India.</p>
  <p class="sub-clause">15.2 Any dispute arising out of or in connection with this Agreement shall be first attempted to be resolved through mutual negotiation. Failing that, it shall be submitted to a sole arbitrator mutually appointed by the parties.</p>
  <p class="sub-clause">15.3 The courts at <strong>${p.city}</strong> shall have exclusive jurisdiction over all matters relating to this Agreement.</p>
</div>

<div class="clause">
  <div class="clause-heading"><span class="clause-num">16.</span>Entire Agreement</div>
  <p class="sub-clause">This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior negotiations, representations, and understandings, whether oral or written.</p>
</div>

<hr style="border: none; border-top: 1.5px solid #111; margin: 40px 0 32px;">

<div class="signature-section">
  <p style="margin-bottom:24px; font-size:13px;">
    IN WITNESS WHEREOF the parties hereto have signed this Agreement on the date first written above.
  </p>

  <div class="signature-grid">
    <div class="sig-block">
      <div class="sig-label">Licensor (Landlord)</div>
      <div class="sig-name">${p.landlordName}</div>
      <div class="sig-line"></div>
      <div class="sig-meta">Signature &amp; Date</div>
      ${p.landlordPan ? `<div class="sig-meta" style="margin-top:4px">PAN: ${p.landlordPan}</div>` : ''}
    </div>
    <div class="sig-block">
      <div class="sig-label">Licensee (Tenant)</div>
      <div class="sig-name">${p.tenantName}</div>
      <div class="sig-line"></div>
      <div class="sig-meta">
        ${p.agreementSigned && p.tenantSignedAt
          ? `<span class="signed-stamp">Signed on RentyBase</span><br><span style="font-size:11px; color:#555; margin-top:4px; display:block">${p.tenantSignedAt}</span>`
          : 'Signature &amp; Date'}
      </div>
      ${p.tenantAadhaarLast4 ? `<div class="sig-meta" style="margin-top:4px">Aadhaar: XXXX XXXX ${p.tenantAadhaarLast4}</div>` : ''}
    </div>
  </div>

  <div class="witness-section">
    <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #555; margin-bottom: 16px;">Witnesses</p>
    <div class="witness-row">
      <div>
        <div class="witness-field"></div>
        <div class="witness-label">Witness 1 - Name &amp; Signature</div>
        <div class="witness-field" style="margin-top:12px;"></div>
        <div class="witness-label">Address</div>
      </div>
      <div>
        <div class="witness-field"></div>
        <div class="witness-label">Witness 2 - Name &amp; Signature</div>
        <div class="witness-field" style="margin-top:12px;"></div>
        <div class="witness-label">Address</div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  Generated by <strong>RentyBase</strong> - rentybase.com<br>
  Agreement Reference: ${p.refNo} - ${p.generatedOn}<br>
  This is a computer-generated document. For legal validity, both parties must sign in the presence of two witnesses.<br>
  Agreements for periods exceeding 11 months must be registered with the Sub-Registrar of Assurances under the Registration Act, 1908.
</div>

</body>
</html>`;
}

// Edge Function handler

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

    const { rentalId }: { rentalId: string } = await req.json();

    if (!rentalId) {
      return jsonResponse({ error: 'rentalId required' }, 400);
    }

    // Fetch rental with all related data
    const { data: rental, error } = await supabase
      .from('rentals')
      .select(`
        *,
        property:properties(*),
        landlord:profiles!rentals_landlord_id_fkey(*),
        tenant:profiles!rentals_tenant_id_fkey(*)
      `)
      .eq('id', rentalId)
      .single();

    if (error || !rental) {
      return jsonResponse({ error: 'Rental not found' }, 404);
    }

    const r = rental as typeof rental & {
      tenant_id: string | null;
      landlord_id: string;
      property: {
        name: string;
        address_line1: string;
        address_line2: string | null;
        city: string;
        state: string;
        pincode: string;
        property_type: string;
      };
      landlord: { full_name: string; pan_number: string | null; email: string | null };
      tenant: { full_name: string; aadhaar_last4: string | null; email: string | null } | null;
    };

    if (authData.user.id !== r.landlord_id && authData.user.id !== r.tenant_id) {
      return jsonResponse({ error: 'You do not have access to this rental agreement' }, 403);
    }

    let tenantProfile = r.tenant;
    if (!tenantProfile && r.tenant_id) {
      const { data: tenantData, error: tenantError } = await supabase
        .from('profiles')
        .select('full_name, aadhaar_last4, email')
        .eq('id', r.tenant_id)
        .maybeSingle();

      if (tenantError) {
        console.error('Tenant lookup error:', tenantError);
      } else {
        tenantProfile = tenantData;
      }
    }

    const tenantName =
      tenantProfile?.full_name?.trim() ||
      tenantProfile?.email?.trim() ||
      (r.tenant_id ? 'Tenant profile pending' : 'Tenant not joined');

    const refNo = `FLV-AGR-${r.id.slice(0, 8).toUpperCase()}`;
    const generatedOn = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const addressParts = [
      r.property.address_line1,
      r.property.address_line2,
      r.property.city,
      r.property.state,
      r.property.pincode,
    ].filter(Boolean);

    const propertyTypeLabel: Record<string, string> = {
      apartment: 'Apartment',
      house: 'Independent House',
      pg: 'PG / Hostel Room',
      commercial: 'Commercial Space',
    };

    const html = buildAgreementHtml({
      refNo,
      generatedOn,
      city: r.property.city,
      state: r.property.state,
      landlordName: r.landlord.full_name,
      landlordPan: r.landlord.pan_number ?? '',
      tenantName,
      tenantAadhaarLast4: tenantProfile?.aadhaar_last4 ?? null,
      propertyName: r.property.name,
      address: addressParts.join(', '),
      propertyType: propertyTypeLabel[r.property.property_type] ?? r.property.property_type,
      startDate: fmtDate(r.start_date),
      endDate: addMonths(r.start_date, 11),
      monthlyRent: Number(r.monthly_rent),
      securityDeposit: Number(r.security_deposit),
      rentDueDay: r.rent_due_day,
      agreementSigned: !!r.agreement_signed_at,
      tenantSignedAt: r.agreement_signed_at
        ? new Date(r.agreement_signed_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          })
        : null,
    });

    // Store in agreements bucket
    const fileName = `agreements/${rentalId}/agreement-${Date.now()}.html`;
    const { error: uploadError } = await supabase.storage
      .from('agreements')
      .upload(fileName, new Blob([html], { type: 'text/html; charset=utf-8' }), {
        contentType: 'text/html; charset=utf-8',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return jsonResponse({ error: 'Failed to store agreement' }, 500);
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('agreements')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError);
      return jsonResponse({ error: 'Failed to prepare agreement link' }, 500);
    }

    const agreementUrl = signedUrlData.signedUrl;

    // Update rental record
    await supabase
      .from('rentals')
      .update({ agreement_url: agreementUrl })
      .eq('id', rentalId);

    return jsonResponse({ agreementUrl, refNo });
  } catch (err) {
    console.error('generate-rental-agreement error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
