-- Keep database storage contracts aligned with the application persistence boundary.
-- These checks make oversized lifecycle identities/payloads fail closed even if a
-- future code path bypasses the TypeScript store.
alter table public.hiring_state_history
  drop constraint if exists hiring_state_history_tenant_id_length_check;
alter table public.hiring_state_history
  add constraint hiring_state_history_tenant_id_length_check
  check (char_length(tenant_id) between 1 and 256);

alter table public.hiring_state_history
  drop constraint if exists hiring_state_history_state_type_length_check;
alter table public.hiring_state_history
  add constraint hiring_state_history_state_type_length_check
  check (char_length(state_type) between 1 and 128);

alter table public.hiring_state_history
  drop constraint if exists hiring_state_history_payload_size_check;
alter table public.hiring_state_history
  add constraint hiring_state_history_payload_size_check
  check (pg_column_size(payload) <= 65536);

comment on constraint hiring_state_history_tenant_id_length_check on public.hiring_state_history is
  'Bounds tenant identity to the application audit/lifecycle storage contract.';
comment on constraint hiring_state_history_state_type_length_check on public.hiring_state_history is
  'Bounds lifecycle state type to the application storage contract.';
comment on constraint hiring_state_history_payload_size_check on public.hiring_state_history is
  'Bounds lifecycle JSONB payload storage to 64 KiB.';
