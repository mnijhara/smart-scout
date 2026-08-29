-- Defense-in-depth for recruiting persistence.
-- The application uses the Supabase service role server-side, which bypasses RLS.
-- Enabling and forcing RLS prevents accidental exposure if these tables are ever queried by
-- an anon/authenticated client or table owner in a future integration.
alter table if exists public.recruiting_audit_events enable row level security;
alter table if exists public.recruiting_audit_events force row level security;
alter table if exists public.hiring_state_history enable row level security;
alter table if exists public.hiring_state_history force row level security;

-- Do not create permissive client policies here. Tenant authorization remains
-- an application concern until the runtime is wired to pass an authenticated
-- tenant claim into the database session. With RLS enabled and no policies,
-- non-service clients receive no rows and cannot mutate these tables.
