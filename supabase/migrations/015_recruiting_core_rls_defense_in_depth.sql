-- Defense-in-depth for the remaining recruiting core tables.
-- Server-side services use the Supabase service role and therefore bypass RLS.
-- Force RLS so a future client/session using anon or authenticated credentials cannot
-- read or mutate tenant-scoped workflows/candidates unless explicit tenant-aware policies
-- are introduced later.
alter table if exists public.hiring_workflows enable row level security;
alter table if exists public.hiring_workflows force row level security;
alter table if exists public.recruiting_candidates enable row level security;
alter table if exists public.recruiting_candidates force row level security;

-- Intentionally create no permissive policies. Until the runtime supplies an authenticated
-- tenant claim to Postgres, non-service clients must receive no rows and cannot mutate data.
