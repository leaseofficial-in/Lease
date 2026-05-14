-- Repair request enhancements: category, urgency, photo, landlord comms, deposit deduction

ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS landlord_note TEXT;
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS deduct_from_deposit BOOLEAN NOT NULL DEFAULT FALSE;
