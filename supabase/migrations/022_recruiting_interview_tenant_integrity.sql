-- Bind persisted interview rows to the same tenant as their referenced workflow/candidate.
-- This prevents a valid workflow/candidate UUID from being reused across tenants.

alter table if exists public.recruiting_interviews
  drop constraint if exists recruiting_interviews_tenant_workflow_fk;
alter table if exists public.recruiting_interviews
  add constraint recruiting_interviews_tenant_workflow_fk
  foreign key (tenant_id, workflow_id)
  references public.hiring_workflows(tenant_id, id)
  on delete cascade
  not valid;

alter table if exists public.recruiting_interviews
  drop constraint if exists recruiting_interviews_tenant_candidate_fk;
alter table if exists public.recruiting_interviews
  add constraint recruiting_interviews_tenant_candidate_fk
  foreign key (tenant_id, candidate_id)
  references public.recruiting_candidates(tenant_id, id)
  on delete cascade
  not valid;

create index if not exists recruiting_interviews_tenant_workflow_fk_idx
  on public.recruiting_interviews(tenant_id, workflow_id);

create index if not exists recruiting_interviews_tenant_candidate_fk_idx
  on public.recruiting_interviews(tenant_id, candidate_id);

alter table if exists public.recruiting_interviews force row level security;
