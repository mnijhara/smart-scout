-- Provide a safe, read-only preflight for validating the NOT VALID tenant FKs.
-- The function is intentionally unavailable to client roles; operators can run it
-- through a privileged database session before validating migration 015 constraints.

create or replace function public.recruiting_tenant_integrity_violation_counts()
returns table (
  candidates_missing_workflow bigint,
  audit_events_missing_workflow bigint,
  audit_events_missing_candidate bigint,
  interviews_missing_workflow bigint,
  interviews_missing_candidate bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.recruiting_candidates c
      left join public.hiring_workflows w
        on w.tenant_id = c.tenant_id and w.id = c.workflow_id
      where w.id is null),
    (select count(*) from public.recruiting_audit_events a
      left join public.hiring_workflows w
        on w.tenant_id = a.tenant_id and w.id = a.workflow_id
      where a.workflow_id is not null and w.id is null),
    (select count(*) from public.recruiting_audit_events a
      left join public.recruiting_candidates c
        on c.tenant_id = a.tenant_id and c.id = a.candidate_id
      where a.candidate_id is not null and c.id is null),
    (select count(*) from public.recruiting_interviews i
      left join public.hiring_workflows w
        on w.tenant_id = i.tenant_id and w.id = i.workflow_id
      where w.id is null),
    (select count(*) from public.recruiting_interviews i
      left join public.recruiting_candidates c
        on c.tenant_id = i.tenant_id and c.id = i.candidate_id
      where c.id is null);
$$;

revoke all on function public.recruiting_tenant_integrity_violation_counts() from public, anon, authenticated;
