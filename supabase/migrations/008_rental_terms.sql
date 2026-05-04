-- Additional rental terms columns
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS notice_period_days INT NOT NULL DEFAULT 30;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS furnished_status TEXT NOT NULL DEFAULT 'unfurnished'
  CHECK (furnished_status IN ('furnished', 'semi_furnished', 'unfurnished'));
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS late_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 5.0;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS maintenance_charges INT NOT NULL DEFAULT 0;
