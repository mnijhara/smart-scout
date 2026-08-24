create table if not exists recruiting_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  workflow_id uuid references hiring_workflows(id) on delete cascade,
  candidate_id uuid references recruiting_candidates(id) on delete set null,
  event_type text not null,
  actor_type text not null default 'system',
  actor_id text,
  provider text,
  model text,
  evidence jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists recruiting_audit_tenant_created_idx on recruiting_audit_events(tenant_id, created_at desc);
create index if not exists recruiting_audit_workflow_idx on recruiting_audit_events(tenant_id, workflow_id, created_at desc);
alter table recruiting_audit_events enable row level security;
revoke all on recruiting_audit_events from anon, authenticated;
