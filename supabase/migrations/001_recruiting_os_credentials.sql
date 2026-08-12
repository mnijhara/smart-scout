-- Smart Scout Recruiting OS credential vault
-- API secrets are encrypted by the Node server before they reach this table.
-- Never expose this table through the browser client.

create table if not exists public.tenant_ai_credentials (
  tenant_id text not null,
  provider text not null check (provider in ('gemini', 'openai', 'anthropic')),
  ciphertext text not null,
  iv text not null,
  tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, provider)
);

create index if not exists tenant_ai_credentials_tenant_idx
  on public.tenant_ai_credentials (tenant_id);

-- Do not grant this table to anon/authenticated roles.
revoke all on public.tenant_ai_credentials from anon, authenticated;

comment on table public.tenant_ai_credentials is
  'Server-side encrypted AI provider credentials. Access only through the Smart Scout server using a service-role connection.';
