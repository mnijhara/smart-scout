-- Defense-in-depth tenant integrity for recruiting persistence.
-- Composite foreign keys ensure a child row cannot point at a workflow/candidate
-- owned by a different tenant. NOT VALID keeps deployment safe when legacy data
-- predates this guard; all future inserts/updates are enforced immediately.

create unique index if not exists hiring_workflows_tenant_id_uidx
  on public.hiring_workflows (tenant_id, id);

create unique index if not exists recruiting_candidates_tenant_id_uidx
  on public.recruiting_candidates (tenant_id, id);

alter table public.recruiting_candidates
  add constraint recruiting_candidates_tenant_workflow_fk
  foreign key (tenant_id, workflow_id)
  references public.hiring_workflows (tenant_id, id)
  on delete cascade
  not valid;

alter table public.recruiting_audit_events
  add constraint recruiting_audit_events_tenant_workflow_fk
  foreign key (tenant_id, workflow_id)
  references public.hiring_workflows (tenant_id, id)
  on delete cascade
  not valid;

alter table public.recruiting_audit_events
  add constraint recruiting_audit_events_tenant_candidate_fk
  foreign key (tenant_id, candidate_id)
  references public.recruiting_candidates (tenant_id, id)
  on delete set null
  not valid;

alter table public.recruiting_interviews
  add constraint recruiting_interviews_tenant_workflow_fk
  foreign key (tenant_id, workflow_id)
  references public.hiring_workflows (tenant_id, id)
  on delete cascade
  not valid;

alter table public.recruiting_interviews
  add constraint recruiting_interviews_tenant_candidate_fk
  foreign key (tenant_id, candidate_id)
  references public.recruiting_candidates (tenant_id, id)
  on delete cascade
  not valid;
