create table if not exists recruiting_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  job_id uuid references hiring_workflows(id) on delete cascade,
  candidate_id uuid references recruiting_candidates(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  storage_path text,
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists recruiting_knockout_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  job_id uuid references hiring_workflows(id) on delete cascade,
  candidate_id uuid references recruiting_candidates(id) on delete cascade,
  passed boolean not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists recruiting_comparisons (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  job_id uuid references hiring_workflows(id) on delete cascade,
  candidate_ids uuid[] not null default '{}',
  result jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists recruiting_integration_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  integration_id text not null,
  event_type text not null,
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received',
  created_at timestamptz not null default now()
);

create index if not exists recruiting_documents_tenant_job_idx on recruiting_documents(tenant_id, job_id);
create index if not exists recruiting_knockout_tenant_job_candidate_idx on recruiting_knockout_results(tenant_id, job_id, candidate_id);
create index if not exists recruiting_comparisons_tenant_job_idx on recruiting_comparisons(tenant_id, job_id);
create index if not exists recruiting_integration_events_tenant_idx on recruiting_integration_events(tenant_id, created_at desc);

alter table recruiting_documents enable row level security;
alter table recruiting_knockout_results enable row level security;
alter table recruiting_comparisons enable row level security;
alter table recruiting_integration_events enable row level security;

revoke all on recruiting_documents from anon, authenticated;
revoke all on recruiting_knockout_results from anon, authenticated;
revoke all on recruiting_comparisons from anon, authenticated;
revoke all on recruiting_integration_events from anon, authenticated;
