import { supabase } from './supabase';

export type EmailType =
  | 'welcome'
  | 'rent_submitted'
  | 'rent_confirmed'
  | 'repair_created'
  | 'proof_submitted'
  | 'proof_reviewed';

interface SendEmailOptions {
  type: EmailType;
  recipientId: string;
  referenceId?: string;
  variables: Record<string, string>;
}

/**
 * Fire-and-forget email dispatch. Never throws — email is never a blocking operation.
 * The Edge Function handles dedup, rate limiting, opt-out checks, and logging.
 */
export function sendEmail(opts: SendEmailOptions): void {
  void supabase.functions.invoke('send-email', { body: opts }).catch(() => {
    // Email delivery failures must never surface to the user.
  });
}
