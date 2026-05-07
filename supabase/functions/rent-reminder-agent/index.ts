// Rent Reminder Agent — free tier implementation using Expo push notifications
//
// Runs daily (via pg_cron). For every overdue rent_payment, sends a push
// notification to the tenant with a day-1 / day-3 / day-7 backoff, then stops.
// No Twilio required. Requires the tenant to have the app installed.
//
// All actions are logged to agent_runs and rental_events for the AI audit trail.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL             = 'https://exp.host/--/api/v2/push/send';

// Backoff: after N prior reminders, wait at least this many hours before next.
// 0 sends → send immediately (day 1)
// 1 send  → wait 48h before day-3 reminder
// 2 sends → wait 96h before day-7 reminder
// 3 sends → stop
const BACKOFF_HOURS = [0, 48, 96];
const MAX_REMINDERS = 3;

interface OverduePayment {
  id: string;
  rental_id: string;
  amount: number;
  month: string;
  late_fee: number;
  tenant: {
    id: string;
    full_name: string;
    push_token: string | null;
  };
  rental: {
    rent_due_day: number;
    landlord_id: string;
    property: { name: string } | null;
  };
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ id: string } | { error: string }> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default', priority: 'high' }),
    });
    const json = await res.json();
    // Expo wraps responses: { data: { id, status } } or { errors: [...] }
    if (json?.data?.status === 'error') return { error: json.data.message ?? 'Expo push error' };
    if (json?.errors?.length) return { error: json.errors[0].message };
    return { id: json?.data?.id ?? 'sent' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

serve(async (_req) => {
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const now = new Date();
  let processed = 0;
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    // 1. Fetch overdue payments with tenant push token + rental info
    const { data: payments, error: qErr } = await db
      .from('rent_payments')
      .select(`
        id, rental_id, amount, month, late_fee,
        tenant:profiles!rent_payments_tenant_id_fkey ( id, full_name, push_token ),
        rental:rentals!rent_payments_rental_id_fkey (
          rent_due_day, landlord_id,
          property:properties!rentals_property_id_fkey ( name )
        )
      `)
      .eq('status', 'overdue');

    if (qErr) throw new Error(`DB query failed: ${qErr.message}`);
    if (!payments?.length) {
      return Response.json({ ok: true, message: 'No overdue payments', processed: 0 });
    }

    for (const raw of payments as unknown as OverduePayment[]) {
      processed++;
      const { id: paymentId, rental_id, amount, month, late_fee, tenant, rental } = raw;
      const pushToken = tenant?.push_token;

      // No push token — tenant hasn't opened the app or denied notifications
      if (!pushToken) {
        skipped++;
        continue;
      }

      // 2. Count prior completed reminders for this payment
      const { data: priorRuns } = await db
        .from('agent_runs')
        .select('id, completed_at')
        .eq('agent_type', 'rent-reminder')
        .eq('trigger_id', paymentId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      const priorCount = priorRuns?.length ?? 0;

      if (priorCount >= MAX_REMINDERS) {
        skipped++;
        continue;
      }

      // 3. Enforce backoff window
      const requiredWaitHours = BACKOFF_HOURS[priorCount];
      if (requiredWaitHours > 0 && priorRuns?.length) {
        const lastSentAt = new Date(priorRuns[0].completed_at!);
        const hoursSinceLast = (now.getTime() - lastSentAt.getTime()) / 3_600_000;
        if (hoursSinceLast < requiredWaitHours) {
          skipped++;
          continue;
        }
      }

      // 4. Calculate days overdue
      const monthDate = new Date(month + 'T00:00:00Z');
      const dueDate = new Date(Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth(),
        rental.rent_due_day,
      ));
      const daysOverdue = Math.max(1, Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000));
      const totalAmount = amount + (late_fee ?? 0);
      const reminderNum = priorCount + 1;

      const pushTitle = `Rent overdue — ${formatMonth(month)}`;
      const pushBody =
        `₹${formatINR(totalAmount)} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue` +
        (rental.property?.name ? ` for ${rental.property.name}` : '') +
        '. Tap to pay now.';

      // 5. Create agent_run record (status=running)
      const { data: agentRun, error: runErr } = await db
        .from('agent_runs')
        .insert({
          agent_type: 'rent-reminder',
          trigger_event: 'payment_overdue',
          trigger_id: paymentId,
          input: {
            payment_id: paymentId,
            tenant_id: tenant.id,
            amount: totalAmount,
            month,
            days_overdue: daysOverdue,
            reminder_number: reminderNum,
          },
          status: 'running',
        })
        .select('id')
        .single();

      if (runErr || !agentRun) {
        errors.push(`payment ${paymentId}: could not create agent_run`);
        continue;
      }

      // 6. Send push notification
      const result = await sendExpoPush(
        pushToken,
        pushTitle,
        pushBody,
        { rental_id, screen: 'pay-rent' },
      );

      if ('error' in result) {
        await db
          .from('agent_runs')
          .update({ status: 'failed', error: result.error, completed_at: now.toISOString() })
          .eq('id', agentRun.id);
        errors.push(`payment ${paymentId}: ${result.error}`);
        continue;
      }

      // 7. Mark run completed
      await db
        .from('agent_runs')
        .update({
          status: 'completed',
          output: { expo_id: result.id, reminder_number: reminderNum },
          completed_at: now.toISOString(),
        })
        .eq('id', agentRun.id);

      // 8. Write to in-app notifications table
      await db.from('notifications').insert({
        user_id: tenant.id,
        title: pushTitle,
        body: pushBody,
        type: 'rent_due',
        read: false,
        data: { rental_id, payment_id: paymentId },
      });

      // 9. Append to rental event log
      await db.from('rental_events').insert({
        rental_id,
        actor_type: 'agent',
        actor_id: null,
        event_type: 'rent_reminder_sent',
        payload: {
          payment_id: paymentId,
          tenant_id: tenant.id,
          days_overdue: daysOverdue,
          reminder_number: reminderNum,
          channel: 'push',
          expo_id: result.id,
        },
        idempotency_key: `rent_reminder_${paymentId}_${reminderNum}`,
      });

      sent++;
    }

    return Response.json({ ok: true, processed, sent, skipped, errors });
  } catch (err) {
    console.error('rent-reminder-agent:', err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
});
