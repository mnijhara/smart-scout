-- Keep the persisted approval action contract aligned with the recruiting
-- control-plane type, which also supports JD approval requests.
-- This is intentionally idempotent for environments that have already run
-- the baseline control-plane persistence migration.

alter table recruiting_approvals
  drop constraint if exists recruiting_approvals_action_check;

alter table recruiting_approvals
  add constraint recruiting_approvals_action_check
  check (action in ('jd_approval','reject','decision','compensation','offer','employee_create'));
