-- Extend default invite link validity from 72 hours to 7 days.
-- 72h is too short: a landlord who creates a rental on Friday and
-- the tenant is slow to respond over the weekend ends up with an
-- expired link on Monday, with no way to regenerate it.
ALTER TABLE rentals
  ALTER COLUMN invite_expires_at SET DEFAULT now() + interval '7 days';
