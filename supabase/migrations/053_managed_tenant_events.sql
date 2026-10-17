-- Two events for the landlord-managed flow (052), so it can be measured.
--
--   tenant_tracked  a landlord started tracking rent for a tenant with no account
--   rent_link_sent  a landlord sent a rent reminder or receipt link
--
-- The CHECK constraint is the allow-list lib/analytics/track.ts must match; see
-- lib/analytics/track.test.ts.

alter table public.product_events drop constraint if exists product_events_known_event;
alter table public.product_events add constraint product_events_known_event check (event = any (array[
  'signup_started', 'signup_completed',
  'property_create_started', 'property_created',
  'rental_create_started', 'rental_created',
  'invite_sent', 'invite_regenerated',
  'invite_opened', 'invite_accepted',
  'payment_recorded', 'payment_confirmed', 'repair_raised', 'agreement_signed',
  'tenant_tracked', 'rent_link_sent'
]::text[]));
