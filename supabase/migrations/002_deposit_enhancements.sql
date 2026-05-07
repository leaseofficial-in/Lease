-- Enhance deposit_transactions with category, payment method, and reference
-- Run in Supabase SQL Editor

ALTER TABLE deposit_transactions
  ADD COLUMN IF NOT EXISTS category       TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS reference      TEXT;

-- category: used on deductions — 'damage' | 'cleaning' | 'unpaid_rent' | 'other'
-- payment_method: used on received/refund — 'upi' | 'bank_transfer' | 'cash'
-- reference: UTR number, UPI transaction ID, or free-form receipt note
