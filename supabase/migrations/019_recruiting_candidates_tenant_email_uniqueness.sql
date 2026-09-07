-- Keep candidate email uniqueness tenant-scoped so one tenant cannot block
-- another tenant from persisting the same candidate email in its own workflow.
-- The previous index was workflow-scoped only and therefore leaked a cross-tenant
-- uniqueness constraint into otherwise isolated recruiting data.

drop index if exists public.recruiting_candidates_email_workflow_idx;

create unique index if not exists recruiting_candidates_tenant_email_workflow_idx
  on public.recruiting_candidates (tenant_id, workflow_id, lower(email))
  where email is not null;
