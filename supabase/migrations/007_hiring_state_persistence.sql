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

-- Enforce tenant isolation at the persistence boundary. Application filters are not
-- sufficient if a caller can supply a mismatched tenant_id for an otherwise valid UUID.
create or replace function public.validate_hiring_state_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_tenant text;
  candidate_tenant text;
  candidate_workflow uuid;
begin
  select tenant_id into workflow_tenant
    from public.hiring_workflows
   where id = new.workflow_id;

  if workflow_tenant is null or workflow_tenant <> new.tenant_id then
    raise exception 'hiring state tenant does not match workflow tenant';
  end if;

  if new.candidate_id is not null then
    select tenant_id, workflow_id into candidate_tenant, candidate_workflow
      from public.recruiting_candidates
     where id = new.candidate_id;

    if candidate_tenant is null
       or candidate_tenant <> new.tenant_id
       or candidate_workflow <> new.workflow_id then
      raise exception 'hiring state candidate does not match workflow tenant/workflow';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists hiring_state_history_tenant_guard on public.hiring_state_history;
create trigger hiring_state_history_tenant_guard
before insert or update on public.hiring_state_history
for each row execute function public.validate_hiring_state_tenant();

revoke all on public.hiring_state_history from anon, authenticated;

comment on table public.hiring_state_history is
  'Durable tenant-scoped hiring lifecycle state history for decisions, compensation, offers and onboarding transitions.';
comment on function public.validate_hiring_state_tenant() is
  'Prevents cross-tenant workflow or candidate references from entering hiring lifecycle state history.';
