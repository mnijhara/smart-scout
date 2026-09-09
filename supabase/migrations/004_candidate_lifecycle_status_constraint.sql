-- Keep persisted candidate lifecycle states aligned with the application contract.
-- The NOT VALID phase makes the migration explicit about pre-existing data: VALIDATE
-- will fail rather than silently rewriting an existing production lifecycle state.

alter table public.recruiting_candidates
  add constraint recruiting_candidates_status_check
  check (status in (
    'discovered',
    'screened',
    'shortlisted',
    'interview',
    'selected',
    'rejected',
    'offered',
    'accepted',
    'onboarded'
  )) not valid;

alter table public.recruiting_candidates
  validate constraint recruiting_candidates_status_check;
