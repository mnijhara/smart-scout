-- Keep persisted audit records bound to the same tenant as referenced hiring entities.
-- Constraints are NOT VALID so existing data can be remediated before validation.

alter table recruiting_audit_events
  drop constraint if exists recruiting_audit_tenant_workflow_fk;
alter table recruiting_audit_events
  add constraint recruiting_audit_tenant_workflow_fk
  foreign key (tenant_id, workflow_id)
  references hiring_workflows(tenant_id, id)
  on delete cascade
  not valid;

alter table recruiting_audit_events
  drop constraint if exists recruiting_audit_tenant_candidate_fk;
alter table recruiting_audit_events
  add constraint recruiting_audit_tenant_candidate_fk
  foreign key (tenant_id, candidate_id)
  references recruiting_candidates(tenant_id, id)
  on delete cascade
  not valid;

alter table recruiting_audit_events
  drop constraint if exists recruiting_audit_actor_not_blank;
alter table recruiting_audit_events
  add constraint recruiting_audit_actor_not_blank
  check (actor_id is null or length(btrim(actor_id)) between 1 and 256)
  not valid;

create index if not exists recruiting_audit_tenant_workflow_idx
  on recruiting_audit_events(tenant_id, workflow_id, created_at desc);
create index if not exists recruiting_audit_tenant_candidate_idx
  on recruiting_audit_events(tenant_id, candidate_id, created_at desc);

alter table recruiting_audit_events force row level security;
