-- Preserves the candidate/workflow audit query index as a unique migration version.
create index if not exists recruiting_audit_events_tenant_workflow_candidate_created_at_idx
  on recruiting_audit_events (tenant_id, workflow_id, candidate_id, created_at desc);
