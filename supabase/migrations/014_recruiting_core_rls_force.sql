-- Extend the defense-in-depth RLS posture to the core recruiting tables.
-- The server uses the Supabase service role, while direct client access must remain denied
-- until authenticated tenant claims are deliberately wired into database policies.
alter table if exists public.hiring_workflows enable row level security;
alter table if exists public.hiring_workflows force row level security;
alter table if exists public.recruiting_candidates enable row level security;
alter table if exists public.recruiting_candidates force row level security;
alter table if exists public.recruiting_interviews enable row level security;
alter table if exists public.recruiting_interviews force row level security;

revoke all on public.hiring_workflows from anon, authenticated;
revoke all on public.recruiting_candidates from anon, authenticated;
revoke all on public.recruiting_interviews from anon, authenticated;
