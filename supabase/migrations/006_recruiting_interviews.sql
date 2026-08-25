create table if not exists recruiting_interviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  workflow_id uuid references hiring_workflows(id) on delete cascade,
  candidate_id uuid references recruiting_candidates(id) on delete cascade,
  plan jsonb not null default '{}'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'planned' check (status in ('planned','in_progress','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, workflow_id, candidate_id)
);
create index if not exists recruiting_interviews_tenant_workflow_idx on recruiting_interviews(tenant_id, workflow_id, updated_at desc);
create index if not exists recruiting_interviews_tenant_candidate_idx on recruiting_interviews(tenant_id, candidate_id, updated_at desc);
alter table recruiting_interviews enable row level security;
revoke all on recruiting_interviews from anon, authenticated;
