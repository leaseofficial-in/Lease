-- 019: In-app messaging, deposit dispute, repair vendor assignment, lease lifecycle

-- In-app messaging thread per rental
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id  UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES profiles(id),
  body       TEXT NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Rental parties can send and read messages') THEN
    CREATE POLICY "Rental parties can send and read messages"
      ON messages FOR ALL USING (
        EXISTS (SELECT 1 FROM rentals r WHERE r.id = messages.rental_id AND (r.landlord_id = auth.uid() OR r.tenant_id = auth.uid()))
      );
  END IF;
END $$;

-- Deposit dispute columns
ALTER TABLE deposit_transactions ADD COLUMN IF NOT EXISTS tenant_dispute_note TEXT;
ALTER TABLE deposit_transactions ADD COLUMN IF NOT EXISTS dispute_status TEXT NOT NULL DEFAULT 'none'
  CHECK (dispute_status IN ('none','disputed','resolved'));
ALTER TABLE deposit_transactions ADD COLUMN IF NOT EXISTS dispute_resolved_note TEXT;

-- Repair vendor assignment + tenant confirm
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS vendor_phone TEXT;
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS resolved_confirmed_at TIMESTAMPTZ;

-- Lease lifecycle: notice, move-out, escalation tracking
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS notice_given_at TIMESTAMPTZ;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS move_out_date DATE;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS escalation_applied_at DATE;
