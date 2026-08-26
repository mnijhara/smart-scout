-- Persist lifecycle state transitions in Supabase instead of relying on a process-local file in production.
create table if not exists public.hiring_state_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  workflow_id uuid not null references public.hiring_workflows(id) on delete cascade,
  candidate_id uuid references public.recruiting_candidates(id) on delete set null,
  state_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hiring_state_history_tenant_workflow_idx
  on public.hiring_state_history (tenant_id, workflow_id, state_type, created_at desc);

revoke all on public.hiring_state_history from anon, authenticated;

comment on table public.hiring_state_history is
  'Durable tenant-scoped hiring lifecycle state history for decisions, compensation, offers and onboarding transitions.';
