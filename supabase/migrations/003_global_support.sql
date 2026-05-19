-- ============================================================
-- RentyBase — Global / Internationalization Support
-- Migration: 003_global_support
--
-- SAFETY CONTRACT:
--   • Only ADD new nullable columns with safe defaults.
--   • Zero changes to existing columns, constraints, triggers, or RLS.
--   • Existing India users get 'IN' / 'INR' / 'Asia/Kolkata' automatically.
--   • All queries without these fields continue to work unchanged.
-- ============================================================

-- ─── profiles: region preferences ─────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country_code  text DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS timezone      text DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS locale        text DEFAULT 'en-IN';

-- ─── properties: location country ─────────────────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'IN';

-- ─── rent_payments: extended payment methods ───────────────────────────────────
-- payment_method is already a text column (not enum) so new values work without ALTER TYPE.
-- New global methods: 'zelle', 'ach', 'wire', 'check', 'credit_card',
--                     'faster_payments', 'direct_debit', 'neft'
-- (neft is new label for what was called bank_transfer in India specifically)
-- Existing 'upi', 'bank_transfer', 'cash', 'cheque' remain valid forever.

-- ─── deposit_transactions: payment methods ────────────────────────────────────
-- Same text column — no changes needed; existing values stay valid.

-- ─── Indexes for country-based queries ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_country   ON profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_properties_country ON properties(country_code);

-- ─── Back-fill existing rows ───────────────────────────────────────────────────
-- Already handled by DEFAULT values above, but explicit for clarity.
-- Only updates rows that somehow got NULL (shouldn't happen with DEFAULT, but safe).

UPDATE profiles    SET country_code  = 'IN'           WHERE country_code  IS NULL;
UPDATE profiles    SET currency_code = 'INR'          WHERE currency_code IS NULL;
UPDATE profiles    SET timezone      = 'Asia/Kolkata' WHERE timezone      IS NULL;
UPDATE profiles    SET locale        = 'en-IN'        WHERE locale        IS NULL;
UPDATE properties  SET country_code  = 'IN'           WHERE country_code  IS NULL;
