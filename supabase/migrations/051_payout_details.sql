-- Somewhere for a landlord outside India to say how they want to be paid.
--
-- The only payout field was profiles.upi_id, shown only to Indian accounts. A
-- landlord in London, Nairobi or Toronto had nowhere to put a sort code, an
-- M-Pesa till number, an Interac e-mail or an IBAN, so a tenant recording rent
-- had no idea where to send it. Free text, because the right shape differs per
-- country and per landlord; capped so it stays a note, not a document.
--
-- Tenants already read their landlord's profile row through
-- "Tenants can view landlord profiles" (001), so no policy change is needed.
-- The profile UI only shows the field once this column exists.

alter table profiles add column if not exists payout_details text;

alter table profiles drop constraint if exists profiles_payout_details_len;
alter table profiles add constraint profiles_payout_details_len
  check (payout_details is null or char_length(payout_details) <= 500);

comment on column profiles.payout_details is
  'Landlord''s free-text payment instructions shown to their tenants (bank, IBAN, mobile money, Zelle, Interac...). Max 500 chars.';
