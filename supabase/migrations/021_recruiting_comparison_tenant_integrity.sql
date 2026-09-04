-- Bind persisted candidate comparisons to the same tenant as their referenced job.
-- The comparison record must not be able to point across tenant boundaries.

alter table recruiting_comparisons
  drop constraint if exists recruiting_comparisons_tenant_job_fk;
alter table recruiting_comparisons
  add constraint recruiting_comparisons_tenant_job_fk
  foreign key (tenant_id, job_id)
  references hiring_workflows(tenant_id, id)
  on delete cascade
  not valid;

create index if not exists recruiting_comparisons_tenant_job_fk_idx
  on recruiting_comparisons(tenant_id, job_id);

alter table recruiting_comparisons force row level security;
