import { supabase } from './supabase';

type ActorType = 'landlord' | 'tenant' | 'agent' | 'system';

interface WriteEventOptions {
  rentalId: string;
  actorType: ActorType;
  actorId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
}

/**
 * Appends an immutable event to the rental_events log.
 * Failures are swallowed — event logging must never break the primary user action.
 */
export async function writeRentalEvent(opts: WriteEventOptions): Promise<void> {
  const { rentalId, actorType, actorId, eventType, payload = {}, idempotencyKey } = opts;
  try {
    await supabase.from('rental_events').insert({
      rental_id: rentalId,
      actor_type: actorType,
      actor_id: actorId ?? null,
      event_type: eventType,
      payload,
      idempotency_key: idempotencyKey ?? null,
    });
  } catch {
    // Event log failures are non-fatal — the user action already succeeded.
  }
}
