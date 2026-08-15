-- Production persistence for the recruiting control plane.
-- Backend services should use the Supabase service role for these tables and
-- enforce tenant identity before every query. RLS is enabled so browser roles
-- cannot read/write control-plane records directly.

create table if not exists recruiting_approvals (
  id text primary key,
  tenant_id text not null,
  job_id text not null,
  candidate_id text,
  action text not null check (action in ('reject','decision','compensation','offer','employee_create')),
  status text not null check (status in ('pending','approved','rejected')),
  requested_by text not null,
  decided_by text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recruiting_audit_events (
  id text primary key,
  tenant_id text not null,
  job_id text,
  candidate_id text,
  action text not null,
  actor text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recruiting_interview_schedules (
  id text primary key,
  tenant_id text not null,
  job_id text not null,
  candidate_id text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  mode text not null check (mode in ('ai_audio','human','panel')),
  status text not null check (status in ('proposed','confirmed','cancelled')),
  candidate_email text,
  interview_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruiting_interview_schedules_valid_window check (ends_at > starts_at)
);

create table if not exists recruiting_usage (
  id text primary key,
  tenant_id text not null,
  period text not null,
  feature text not null,
  units numeric not null check (units >= 0),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recruiting_approvals_tenant_job_idx on recruiting_approvals (tenant_id, job_id, created_at desc);
create index if not exists recruiting_audit_tenant_job_idx on recruiting_audit_events (tenant_id, job_id, created_at desc);
create index if not exists recruiting_schedules_tenant_job_idx on recruiting_interview_schedules (tenant_id, job_id, starts_at);
create index if not exists recruiting_usage_tenant_period_idx on recruiting_usage (tenant_id, period, feature);

alter table recruiting_approvals enable row level security;
alter table recruiting_audit_events enable row level security;
alter table recruiting_interview_schedules enable row level security;
alter table recruiting_usage enable row level security;

-- No browser-facing policies are intentionally created here. The backend
-- control plane is the only writer/reader and must apply tenant authorization.
