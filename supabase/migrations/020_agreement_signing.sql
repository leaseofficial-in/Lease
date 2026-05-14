-- 020: Bilateral agreement signing — custom clauses, landlord countersign, status tracking

ALTER TABLE rentals ADD COLUMN IF NOT EXISTS agreement_custom_clauses TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS landlord_signed_at TIMESTAMPTZ;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS agreement_status TEXT NOT NULL DEFAULT 'draft'
  CHECK (agreement_status IN ('draft','pending_signature','tenant_signed','executed'));
