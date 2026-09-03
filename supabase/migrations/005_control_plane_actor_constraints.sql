-- Harden control-plane actor persistence so malformed or placeholder actor values
-- cannot enter the durable recruiting audit/approval trail.
-- Idempotent constraints make this safe to apply after the baseline migrations.

alter table recruiting_approvals
  drop constraint if exists recruiting_approvals_requested_by_nonblank_check;

alter table recruiting_approvals
  add constraint recruiting_approvals_requested_by_nonblank_check
  check (length(btrim(requested_by)) between 1 and 256);

alter table recruiting_audit_events
  drop constraint if exists recruiting_audit_events_actor_nonblank_check;

alter table recruiting_audit_events
  add constraint recruiting_audit_events_actor_nonblank_check
  check (length(btrim(actor)) between 1 and 256);
