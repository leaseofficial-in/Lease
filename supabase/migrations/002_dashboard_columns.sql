-- Migration 002: columns added for web dashboard features
-- Run this in Supabase SQL Editor → Run

-- Properties: full address support + PG room count
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address    TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state      TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pincode    TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_rooms INTEGER;

-- Rentals: agreement tracking + dates
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS agreement_url       TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS start_date          DATE;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS end_date            DATE;

-- Payments: manual payment recording fields (if not already added)
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS payment_method   TEXT;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS utr_number       TEXT;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS payment_note     TEXT;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Add pending_verification to payment_status enum (if not already done)
DO $$ BEGIN
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'pending_verification';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles: UPI ID field (if not already added)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS upi_id TEXT;
