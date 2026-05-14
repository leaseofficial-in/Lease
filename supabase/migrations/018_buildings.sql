-- Multi-unit building architecture: buildings table + properties FK

CREATE TABLE IF NOT EXISTS buildings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id   UUID REFERENCES profiles(id) NOT NULL,
  name          TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  pincode       TEXT NOT NULL,
  property_type TEXT,
  total_units   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own buildings"
  ON buildings FOR ALL USING (landlord_id = auth.uid());

CREATE POLICY "Tenants view building via rental"
  ON buildings FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN properties p ON r.property_id = p.id
      WHERE p.building_id = buildings.id AND r.tenant_id = auth.uid()
    )
  );

ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES buildings(id);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS unit_number TEXT;
