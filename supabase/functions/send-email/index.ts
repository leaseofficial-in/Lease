// Central email service for RentyBase
//
// Design principles:
//   - One entry point for ALL transactional emails
//   - Dedup by (type + referenceId) within a cooldown window — never double-send
//   - Daily cap per recipient per category — never spam
//   - Respects per-user email_notifications preferences
//   - Every send attempt logged to email_logs for observability
//   - Email failures are NEVER fatal to the user action that triggered them

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL                = Deno.env.get('FROM_EMAIL') ?? 'RentyBase <noreply@rentybase.com>';
const APP_URL                   = 'https://app.rentybase.com';

// ─── Types ────────────────────────────────────────────────────────────────────

type EmailType =
  | 'welcome'
  | 'rent_submitted'
  | 'rent_confirmed'
  | 'repair_created'
  | 'proof_submitted'
  | 'proof_reviewed';

type EmailCategory = 'critical' | 'important';

interface EmailRequest {
  type: EmailType;
  recipientId: string;
  referenceId?: string;
  variables: Record<string, string>;
}

interface EmailTemplate {
  subject: string;
  previewText: string;
  html: string;
}

// ─── Policy ───────────────────────────────────────────────────────────────────

const CATEGORY: Record<EmailType, EmailCategory> = {
  welcome:        'critical',
  rent_submitted: 'critical',
  rent_confirmed: 'critical',
  repair_created: 'important',
  proof_submitted:'important',
  proof_reviewed: 'important',
};

// Within this window, the same (type + referenceId) will not be sent twice
const COOLDOWN_HOURS: Record<EmailType, number> = {
  welcome:        24 * 7, // one welcome ever
  rent_submitted:  2,
  rent_confirmed:  2,
  repair_created:  1,
  proof_submitted: 4,
  proof_reviewed:  4,
};

// Max emails per recipient per day (important category only; critical is uncapped)
const DAILY_CAP_IMPORTANT = 3;

// ─── HTML Templates ───────────────────────────────────────────────────────────

function base(previewText: string, body: string): string {
  const ghost = '&zwnj;&nbsp;'.repeat(10);
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>RentyBase</title>
</head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}${ghost}</div>
<table width="100%" role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="background:#F0F2F5;padding:40px 16px;" align="center">
<table width="100%" role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
  <tr><td style="padding:0 0 18px 2px;">
    <span style="font-size:17px;font-weight:700;color:#5046E4;letter-spacing:-0.3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">RentyBase</span>
  </td></tr>
  <tr><td style="background:#ffffff;border-radius:14px;border:1px solid #E4E4E7;overflow:hidden;">
    <table width="100%" role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr><td style="padding:36px 36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${body}</td></tr>
      <tr><td style="padding:16px 36px 20px;border-top:1px solid #F4F4F5;background:#FAFAFA;">
        <p style="margin:0;font-size:12px;color:#A1A1AA;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          You're receiving this because of activity on your RentyBase account.<br>
          <a href="${APP_URL}" style="color:#A1A1AA;text-decoration:underline;">RentyBase</a> &middot; Renting made trustworthy &middot; India
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#09090B;letter-spacing:-0.5px;line-height:1.3;">${text}</h1>`;
}

function p(text: string, muted = false) {
  const color = muted ? '#71717A' : '#3F3F46';
  return `<p style="margin:0 0 20px;font-size:15px;color:${color};line-height:1.65;">${text}</p>`;
}

function detailTable(rows: [string, string][]): string {
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:11px 16px;border-bottom:1px solid #F4F4F5;font-size:13px;color:#71717A;white-space:nowrap;width:40%;">${label}</td>
      <td style="padding:11px 16px;border-bottom:1px solid #F4F4F5;font-size:13px;color:#09090B;font-weight:600;text-align:right;">${value}</td>
    </tr>`).join('');
  return `<table width="100%" role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-radius:10px;border:1px solid #E4E4E7;overflow:hidden;margin:20px 0;">
    ${rowsHtml}
  </table>`;
}

function cta(label: string, url: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px;">
    <tr><td style="border-radius:10px;background:#5046E4;">
      <a href="${url}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:-0.1px;">${label} →</a>
    </td></tr>
  </table>`;
}

function stepList(steps: [string, string][]): string {
  const items = steps.map(([title, desc], i) => `
    <tr>
      <td valign="top" style="padding:0 14px 0 0;width:28px;">
        <div style="width:24px;height:24px;border-radius:50%;background:#EEF2FF;display:inline-block;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#5046E4;">${i + 1}</div>
      </td>
      <td valign="top" style="padding:2px 0 18px;">
        <span style="font-size:14px;font-weight:600;color:#09090B;">${title}</span><br>
        <span style="font-size:13px;color:#71717A;line-height:1.5;">${desc}</span>
      </td>
    </tr>`).join('');
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 8px;width:100%;">${items}</table>`;
}

function badge(text: string, color: string, bg: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;color:${color};background:${bg};">${text}</span>`;
}

// ─── Template Renderers ───────────────────────────────────────────────────────

function renderWelcome(v: Record<string, string>): EmailTemplate {
  const isLandlord = v.role === 'landlord';
  const subject = `Welcome to RentyBase, ${v.name}`;
  const previewText = isLandlord
    ? 'Your landlord account is ready. Add a property to get started.'
    : 'Your account is ready. Join your rental to get started.';

  const steps: [string, string][] = isLandlord
    ? [
        ['Add your property', 'Enter your property details and set the rent amount.'],
        ['Invite your tenant', 'Share a link — they join in under a minute.'],
        ['Collect rent effortlessly', 'Tenants pay, you get notified, everything is logged.'],
      ]
    : [
        ['Join your rental', 'Paste the invite link your landlord shared with you.'],
        ['Pay rent online', 'UPI, bank transfer, or cash — all tracked automatically.'],
        ['Upload move-in photos', 'Protect your deposit with timestamped room photos.'],
      ];

  const body = `
    ${h1(`Welcome, ${v.name}.`)}
    ${p(`You've joined RentyBase as a <strong>${isLandlord ? 'landlord' : 'tenant'}</strong>. Here's how to get the most out of it:`)}
    ${stepList(steps)}
    ${cta('Open RentyBase', APP_URL)}
    ${p('If you have any questions, just reply to this email.', true)}`;

  return { subject, previewText, html: base(previewText, body) };
}

function renderRentSubmitted(v: Record<string, string>): EmailTemplate {
  const subject = `Rent submitted for ${v.month} — ${v.propertyName}`;
  const previewText = `${v.tenantName} marked their rent paid via ${v.method}. Please confirm receipt.`;
  const body = `
    ${h1('Rent payment submitted')}
    ${p(`<strong>${v.tenantName}</strong> has submitted their rent for <strong>${v.month}</strong> and is awaiting your confirmation.`)}
    ${detailTable([
      ['Property', v.propertyName],
      ['Month', v.month],
      ['Amount', `₹${v.amount}`],
      ['Method', v.method],
    ])}
    ${cta('Confirm Payment', `${APP_URL}?screen=payments`)}
    ${p('Once you confirm, the tenant receives a receipt and the record is finalized.', true)}`;

  return { subject, previewText, html: base(previewText, body) };
}

function renderRentConfirmed(v: Record<string, string>): EmailTemplate {
  const subject = `Rent confirmed — ${v.month}`;
  const previewText = `Your landlord confirmed receipt of ₹${v.amount} for ${v.month}.`;
  const body = `
    ${h1('Your rent has been confirmed.')}
    ${p(`Your landlord confirmed receipt of your rent payment for <strong>${v.month}</strong>.`)}
    ${detailTable([
      ['Property', v.propertyName],
      ['Month', v.month],
      ['Amount', `₹${v.amount}`],
      ['Status', '&#10003;&nbsp; Confirmed'],
    ])}
    ${cta('View Rent History', `${APP_URL}?screen=rent-history`)}
    ${p('Keep this email as your payment record.', true)}`;

  return { subject, previewText, html: base(previewText, body) };
}

function renderRepairCreated(v: Record<string, string>): EmailTemplate {
  const priorityColor: Record<string, [string, string]> = {
    low:    ['#71717A', '#F4F4F5'],
    medium: ['#92400E', '#FEF3C7'],
    high:   ['#991B1B', '#FEE2E2'],
    urgent: ['#7F1D1D', '#FEE2E2'],
  };
  const [pc, pb] = priorityColor[v.priority] ?? priorityColor.medium;
  const priorityBadge = badge(v.priority.charAt(0).toUpperCase() + v.priority.slice(1), pc, pb);

  const subject = `New repair request: "${v.title}" — ${v.propertyName}`;
  const previewText = `${v.tenantName} raised a ${v.priority} priority repair request at ${v.propertyName}.`;
  const body = `
    ${h1('New repair request')}
    ${p(`Your tenant <strong>${v.tenantName}</strong> raised a repair request at <strong>${v.propertyName}</strong>.`)}
    ${detailTable([
      ['Request', v.title],
      ['Priority', priorityBadge],
      ['Property', v.propertyName],
    ])}
    ${v.description ? `<div style="background:#FAFAFA;border:1px solid #E4E4E7;border-radius:10px;padding:14px 16px;margin:0 0 20px;"><p style="margin:0;font-size:13px;color:#3F3F46;line-height:1.6;"><strong>Description:</strong><br>${v.description}</p></div>` : ''}
    ${cta('View Request', `${APP_URL}?screen=repairs`)}
    ${p('Responding promptly improves your landlord rating on RentyBase.', true)}`;

  return { subject, previewText, html: base(previewText, body) };
}

function renderProofSubmitted(v: Record<string, string>): EmailTemplate {
  const typeLabel = v.proofType === 'move_out' ? 'move-out' : 'move-in';
  const subject = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} proof ready for review — ${v.propertyName}`;
  const previewText = `${v.tenantName} submitted ${v.totalPhotos} photos across ${v.roomsCovered} rooms. Review them now.`;
  const body = `
    ${h1(`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} photos submitted`)}
    ${p(`<strong>${v.tenantName}</strong> has submitted their ${typeLabel} proof photos for <strong>${v.propertyName}</strong>.`)}
    ${detailTable([
      ['Photos', `${v.totalPhotos} photos`],
      ['Rooms covered', `${v.roomsCovered} rooms`],
      ['Property', v.propertyName],
    ])}
    ${cta('Review Photos', `${APP_URL}?screen=proof`)}
    ${p('You can approve, request changes, or raise a dispute directly in the app.', true)}`;

  return { subject, previewText, html: base(previewText, body) };
}

function renderProofReviewed(v: Record<string, string>): EmailTemplate {
  const isApproved = v.status === 'approved';
  const statusLabel = isApproved ? 'approved' : v.status === 'rejected' ? 'rejected' : 'under dispute';
  const statusColor = isApproved ? '#16A34A' : '#DC2626';
  const statusBg    = isApproved ? '#F0FDF4' : '#FEF2F2';
  const typeLabel   = v.proofType === 'move_out' ? 'move-out' : 'move-in';

  const subject = `Your ${typeLabel} photos have been ${statusLabel}`;
  const previewText = isApproved
    ? `Your landlord approved your ${typeLabel} proof photos. Your deposit is protected.`
    : `Your landlord has ${statusLabel} your ${typeLabel} photos. Open the app for details.`;

  const body = `
    ${h1(isApproved ? 'Proof approved.' : `Proof ${statusLabel}.`)}
    ${p(`Your landlord reviewed your ${typeLabel} proof photos for <strong>${v.propertyName}</strong>.`)}
    <div style="border-radius:10px;background:${statusBg};border:1px solid ${statusColor}33;padding:16px;margin:0 0 20px;text-align:center;">
      <span style="font-size:15px;font-weight:700;color:${statusColor};">${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}</span>
    </div>
    ${!isApproved && v.disputeNote ? `<div style="background:#FAFAFA;border:1px solid #E4E4E7;border-radius:10px;padding:14px 16px;margin:0 0 20px;"><p style="margin:0;font-size:13px;color:#3F3F46;line-height:1.6;"><strong>Landlord note:</strong><br>${v.disputeNote}</p></div>` : ''}
    ${cta('Open App', `${APP_URL}?screen=proof`)}
    ${p(isApproved ? 'Your deposit protection record is now complete.' : 'Contact your landlord or raise a dispute in the app.', true)}`;

  return { subject, previewText, html: base(previewText, body) };
}

function renderTemplate(type: EmailType, variables: Record<string, string>): EmailTemplate {
  switch (type) {
    case 'welcome':         return renderWelcome(variables);
    case 'rent_submitted':  return renderRentSubmitted(variables);
    case 'rent_confirmed':  return renderRentConfirmed(variables);
    case 'repair_created':  return renderRepairCreated(variables);
    case 'proof_submitted': return renderProofSubmitted(variables);
    case 'proof_reviewed':  return renderProofReviewed(variables);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let payload: EmailRequest;
  try {
    payload = await req.json() as EmailRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { type, recipientId, referenceId, variables } = payload;

  if (!type || !recipientId) {
    return Response.json({ error: 'type and recipientId are required' }, { status: 400 });
  }

  // 1. Look up recipient profile
  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, email, email_notifications')
    .eq('id', recipientId)
    .maybeSingle();

  if (!profile?.email) {
    await db.from('email_logs').insert({
      recipient_id: recipientId,
      recipient_email: 'unknown',
      email_type: type,
      reference_id: referenceId ?? null,
      status: 'skipped',
      skip_reason: 'no_email',
    });
    return Response.json({ ok: true, skipped: true, reason: 'no_email' });
  }

  const prefs = (profile.email_notifications ?? { critical: true, important: true }) as Record<string, boolean>;
  const category = CATEGORY[type];

  // 2. Check preferences (critical always sends; important respects opt-out)
  if (category === 'important' && prefs.important === false) {
    await db.from('email_logs').insert({
      recipient_id: recipientId,
      recipient_email: profile.email,
      email_type: type,
      reference_id: referenceId ?? null,
      status: 'skipped',
      skip_reason: 'opted_out',
    });
    return Response.json({ ok: true, skipped: true, reason: 'opted_out' });
  }

  // 3. Dedup: same (type + referenceId) within cooldown window?
  if (referenceId) {
    const cooldownMs = COOLDOWN_HOURS[type] * 3_600_000;
    const since = new Date(Date.now() - cooldownMs).toISOString();
    const { data: dupe } = await db
      .from('email_logs')
      .select('id')
      .eq('recipient_id', recipientId)
      .eq('email_type', type)
      .eq('reference_id', referenceId)
      .eq('status', 'sent')
      .gte('created_at', since)
      .limit(1)
      .maybeSingle();

    if (dupe) {
      return Response.json({ ok: true, skipped: true, reason: 'dedup' });
    }
  }

  // 4. Daily rate limit for important emails
  if (category === 'important') {
    const since24h = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await db
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .eq('status', 'sent')
      .gte('created_at', since24h);

    if ((count ?? 0) >= DAILY_CAP_IMPORTANT) {
      await db.from('email_logs').insert({
        recipient_id: recipientId,
        recipient_email: profile.email,
        email_type: type,
        reference_id: referenceId ?? null,
        status: 'skipped',
        skip_reason: 'rate_limited',
      });
      return Response.json({ ok: true, skipped: true, reason: 'rate_limited' });
    }
  }

  // 5. Render template
  const template = renderTemplate(type, { ...variables, name: profile.full_name || variables.name || 'there' });

  // 6. Send via Resend
  let resendId: string | null = null;
  let sendError: string | null = null;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [profile.email],
        subject: template.subject,
        html: template.html,
      }),
    });

    const json = await res.json() as { id?: string; message?: string; name?: string };
    if (res.ok && json.id) {
      resendId = json.id;
    } else {
      sendError = json.message ?? json.name ?? 'Resend API error';
    }
  } catch (err) {
    sendError = err instanceof Error ? err.message : 'Network error';
  }

  // 7. Log the result
  await db.from('email_logs').insert({
    recipient_id: recipientId,
    recipient_email: profile.email,
    email_type: type,
    reference_id: referenceId ?? null,
    subject: template.subject,
    status: sendError ? 'failed' : 'sent',
    resend_id: resendId,
    error: sendError,
  });

  if (sendError) {
    console.error(`send-email [${type}] failed for ${profile.email}: ${sendError}`);
    return Response.json({ ok: false, error: sendError }, { status: 502 });
  }

  return Response.json({ ok: true, resendId });
});
