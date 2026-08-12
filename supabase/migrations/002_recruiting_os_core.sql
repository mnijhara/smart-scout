-- Core persistence for Recruiting OS.
-- Keep candidate/workflow data tenant-scoped. Application services must always filter by tenant_id.

create table if not exists public.hiring_workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  title text not null,
  description text not null default '',
  stage text not null default 'job',
  requirements jsonb not null default '{}'::jsonb,
  approval_gates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hiring_workflows_tenant_idx
  on public.hiring_workflows (tenant_id, updated_at desc);

create table if not exists public.recruiting_candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  workflow_id uuid not null references public.hiring_workflows(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  profile_url text,
  source text not null,
  resume_text text,
  score jsonb,
  interview_score numeric,
  status text not null default 'discovered',
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recruiting_candidates_tenant_idx
  on public.recruiting_candidates (tenant_id, workflow_id, updated_at desc);

create unique index if not exists recruiting_candidates_email_workflow_idx
  on public.recruiting_candidates (workflow_id, lower(email))
  where email is not null;

create table if not exists public.recruiting_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  workflow_id uuid references public.hiring_workflows(id) on delete cascade,
  candidate_id uuid references public.recruiting_candidates(id) on delete set null,
  event_type text not null,
  actor_type text not null default 'system',
  actor_id text,
  provider text,
  model text,
  evidence jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists recruiting_audit_events_tenant_idx
  on public.recruiting_audit_events (tenant_id, created_at desc);

revoke all on public.hiring_workflows from anon, authenticated;
revoke all on public.recruiting_candidates from anon, authenticated;
revoke all on public.recruiting_audit_events from anon, authenticated;

comment on table public.recruiting_audit_events is
  'Immutable-style audit stream for AI recommendations and human approval actions.';
