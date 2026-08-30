-- Support candidate-scoped hiring lifecycle reads without scanning a tenant/workflow history.
-- The application filters offer and other candidate-specific states by tenant, workflow,
-- state type, and candidate identity, then orders by newest state.
create index if not exists hiring_state_history_candidate_lookup_idx
  on public.hiring_state_history (tenant_id, workflow_id, state_type, candidate_id, created_at desc);
