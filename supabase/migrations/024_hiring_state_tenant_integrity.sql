-- Backstop the lifecycle tenant trigger with database-enforced composite references.
-- NOT VALID keeps rollout safe until existing rows are remediated and validated separately.

create unique index if not exists hiring_workflows_tenant_id_uidx
  on public.hiring_workflows(tenant_id, id);
create unique index if not exists recruiting_candidates_tenant_id_uidx
  on public.recruiting_candidates(tenant_id, id);

alter table public.hiring_state_history
  drop constraint if exists hiring_state_history_tenant_workflow_fk;
alter table public.hiring_state_history
  add constraint hiring_state_history_tenant_workflow_fk
  foreign key (tenant_id, workflow_id)
  references public.hiring_workflows(tenant_id, id)
  on delete cascade
  not valid;

alter table public.hiring_state_history
  drop constraint if exists hiring_state_history_tenant_candidate_fk;
alter table public.hiring_state_history
  add constraint hiring_state_history_tenant_candidate_fk
  foreign key (tenant_id, candidate_id)
  references public.recruiting_candidates(tenant_id, id)
  on delete set null
  not valid;

create index if not exists hiring_state_history_tenant_workflow_fk_idx
  on public.hiring_state_history(tenant_id, workflow_id);
create index if not exists hiring_state_history_tenant_candidate_fk_idx
  on public.hiring_state_history(tenant_id, candidate_id);

alter table public.hiring_state_history force row level security;
