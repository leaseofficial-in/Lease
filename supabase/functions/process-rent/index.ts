// Scheduled daily at 09:00 IST (03:30 UTC) via Supabase Dashboard:
//   Edge Functions → process-rent → Schedule → "30 3 * * *"
//
// What it does each day:
//   1. Creates missing rent_payment rows for the current month on active rentals
//   2. Flips pending → overdue once the due day has passed (adds late fee)
//   3. Sends Expo push notifications:
//        – 2 days before due: reminder to tenant
//        – Due day:           "due today" to tenant
//        – 1 day after due:   overdue alert to tenant + landlord

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function sendExpoPush(
  tokens: (string | null | undefined)[],
  title: string,
  body: string,
  data: Record<string, string> = {},
) {
  const valid = tokens.filter(Boolean) as string[];
  if (!valid.length) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(valid.map((to) => ({ to, title, body, data, sound: 'default', priority: 'high' }))),
  });
}

Deno.serve(async () => {
  // All date maths in IST
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const today = nowIST.getDate();
  const currentMonth = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-01`;

  // Fetch every active rental that has a tenant
  const { data: rentals, error } = await supabase
    .from('rentals')
    .select(`
      id, monthly_rent, rent_due_day, late_fee_percent,
      tenant_id, landlord_id,
      tenant:profiles!rentals_tenant_id_fkey(push_token, full_name),
      landlord:profiles!rentals_landlord_id_fkey(push_token, full_name),
      property:properties(name)
    `)
    .eq('status', 'active')
    .not('tenant_id', 'is', null);

  if (error) throw new Error(error.message);

  let processed = 0;
  let created = 0;
  let markedOverdue = 0;
  let pushSent = 0;

  for (const r of rentals ?? []) {
    const dueDay = Math.min((r.rent_due_day as number) ?? 1, 28);
    const rent = r.monthly_rent as number;
    const feeRate = (r.late_fee_percent as number) ?? 5;
    const tenantToken = (r.tenant as { push_token?: string })?.push_token ?? null;
    const landlordToken = (r.landlord as { push_token?: string })?.push_token ?? null;
    const tenantName = (r.tenant as { full_name?: string })?.full_name ?? 'Your tenant';
    const propName = (r.property as { name?: string })?.name ?? 'your property';
    const rentStr = `₹${rent.toLocaleString('en-IN')}`;

    // Check existing payment for this month
    const { data: existing } = await supabase
      .from('rent_payments')
      .select('id, status, amount')
      .eq('rental_id', r.id)
      .eq('month', currentMonth)
      .maybeSingle();

    let status = (existing as { status: string } | null)?.status ?? null;

    if (!existing) {
      const isLate = today > dueDay;
      await supabase.from('rent_payments').insert({
        rental_id: r.id,
        tenant_id: r.tenant_id,
        amount: rent,
        month: currentMonth,
        status: isLate ? 'overdue' : 'pending',
        late_fee: isLate ? Math.round(rent * feeRate / 100) : 0,
      });
      status = isLate ? 'overdue' : 'pending';
      created++;
    } else if (status === 'pending' && today > dueDay) {
      const lateFee = Math.round((existing as { amount: number }).amount * feeRate / 100);
      await supabase
        .from('rent_payments')
        .update({ status: 'overdue', late_fee: lateFee })
        .eq('id', (existing as { id: string }).id);
      status = 'overdue';
      markedOverdue++;
    }

    // Push: 2 days before due
    if (today === dueDay - 2 && status === 'pending' && tenantToken) {
      await sendExpoPush([tenantToken], 'Rent due in 2 days',
        `${rentStr} is due on the ${dueDay}th for ${propName}. Pay now to avoid late fees.`,
        { screen: 'pay-rent' });
      pushSent++;
    }

    // Push: due today
    if (today === dueDay && status === 'pending' && tenantToken) {
      await sendExpoPush([tenantToken], 'Rent due today',
        `${rentStr} for ${propName} is due today. Pay now to avoid late fees.`,
        { screen: 'pay-rent' });
      pushSent++;
    }

    // Push: 1 day overdue — alert both parties
    if (today === dueDay + 1 && status === 'overdue') {
      if (tenantToken) {
        await sendExpoPush([tenantToken], 'Rent overdue',
          `Your rent of ${rentStr} for ${propName} is overdue. Please pay now.`,
          { screen: 'pay-rent' });
        pushSent++;
      }
      if (landlordToken) {
        await sendExpoPush([landlordToken], 'Rent not received',
          `${tenantName} has not paid rent for ${propName}. Due was the ${dueDay}th.`,
          { screen: 'property', rental_id: r.id as string });
        pushSent++;
      }
    }

    processed++;
  }

  return new Response(
    JSON.stringify({ ok: true, date: nowIST.toISOString(), processed, created, markedOverdue, pushSent }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
