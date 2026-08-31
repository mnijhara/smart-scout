-- Supporting indexes keep tenant-scoped FK checks and joins bounded as recruiting data grows.
-- These are additive and safe to deploy before validating migration 015 constraints.

create index if not exists recruiting_candidates_tenant_workflow_fk_idx
  on public.recruiting_candidates (tenant_id, workflow_id);

create index if not exists recruiting_audit_events_tenant_workflow_fk_idx
  on public.recruiting_audit_events (tenant_id, workflow_id);

create index if not exists recruiting_audit_events_tenant_candidate_fk_idx
  on public.recruiting_audit_events (tenant_id, candidate_id);

create index if not exists recruiting_interviews_tenant_workflow_fk_idx
  on public.recruiting_interviews (tenant_id, workflow_id);

create index if not exists recruiting_interviews_tenant_candidate_fk_idx
  on public.recruiting_interviews (tenant_id, candidate_id);
