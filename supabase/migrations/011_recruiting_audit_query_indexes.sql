create index if not exists recruiting_audit_events_tenant_workflow_created_at_idx
  on recruiting_audit_events (tenant_id, workflow_id, created_at desc);

create index if not exists recruiting_audit_events_tenant_candidate_created_at_idx
  on recruiting_audit_events (tenant_id, candidate_id, created_at desc);
