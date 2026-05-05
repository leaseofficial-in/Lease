alter table properties
  add column if not exists archived_at timestamptz;

create index if not exists idx_properties_landlord_archived
  on properties (landlord_id, archived_at);
