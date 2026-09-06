-- Let a landlord create a property before they have typed an address.
--
-- Why
-- ---
-- The first thing a new landlord is asked to do is fill a 20-field form with 9
-- required fields: property name, street address, city, state, pincode, plus
-- bedrooms, bathrooms, floor number, notice period, lock-in, late fee % and annual
-- increment %. Nothing happens for them until all of it is in.
--
-- The funnel says that is where they stop. Of 11 landlords: 5 never created a
-- property at all, 4 created one but never got a tenant, 2 have tenants. The
-- moment the product becomes useful — sending a tenant an invite link — sits
-- behind a property dossier.
--
-- None of the address is needed to produce an invite link. It is needed to
-- generate a rental agreement, which happens later and can prompt for it then.
-- These columns are NOT NULL by declaration, not because anything depends on them.
--
-- Safety
-- ------
-- Dropping NOT NULL is strictly widening: every existing row already satisfies the
-- stricter constraint and is untouched, every existing query keeps working, and it
-- is reversible (`set not null` again) as long as no null rows have been written.
-- The client keeps sending these fields whenever the landlord fills them in.
--
-- `name` stays NOT NULL: a property with no label is unusable in a list, and the
-- landlord has to call it something.

alter table public.properties alter column address_line1 drop not null;
alter table public.properties alter column city          drop not null;
alter table public.properties alter column state         drop not null;
alter table public.properties alter column pincode       drop not null;

comment on column public.properties.address_line1 is
  'Optional at creation. Required before a rental agreement can be generated — asked for at that point rather than blocking the landlord''s first property.';

-- Everything else the first-run form demanded already had a default or was
-- nullable, so no further change is needed:
--   rentals.rent_due_day        default 5
--   rentals.late_fee_percent    default 5.0
--   rentals.notice_period_days  default 30
--   rentals.lock_in_period_months, rent_increment_percent, maintenance_charges
--   properties.bedrooms/bathrooms/area_sqft/floor_number  all nullable

-- == Verification ==============================================================
--   select column_name, is_nullable from information_schema.columns
--    where table_name = 'properties'
--      and column_name in ('name','address_line1','city','state','pincode');
--   -> name NO, the rest YES
--
--   Existing rows unchanged: select count(*) from properties where city is null; -> 0
