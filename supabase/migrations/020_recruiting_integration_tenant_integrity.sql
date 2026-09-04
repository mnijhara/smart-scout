-- Bind integration records to the same tenant as their referenced recruiting entities.
-- This closes cross-tenant reference paths left open by the initial integration schema.

create unique index if not exists recruiting_documents_tenant_id_uidx
  on recruiting_documents(tenant_id, id);
create unique index if not exists recruiting_knockout_results_tenant_id_uidx
  on recruiting_knockout_results(tenant_id, id);

alter table recruiting_documents
  drop constraint if exists recruiting_documents_tenant_job_fk;
alter table recruiting_documents
  add constraint recruiting_documents_tenant_job_fk
  foreign key (tenant_id, job_id)
  references hiring_workflows(tenant_id, id)
  on delete cascade
  not valid;

alter table recruiting_documents
  drop constraint if exists recruiting_documents_tenant_candidate_fk;
alter table recruiting_documents
  add constraint recruiting_documents_tenant_candidate_fk
  foreign key (tenant_id, candidate_id)
  references recruiting_candidates(tenant_id, id)
  on delete cascade
  not valid;

alter table recruiting_knockout_results
  drop constraint if exists recruiting_knockout_results_tenant_job_fk;
alter table recruiting_knockout_results
  add constraint recruiting_knockout_results_tenant_job_fk
  foreign key (tenant_id, job_id)
  references hiring_workflows(tenant_id, id)
  on delete cascade
  not valid;

alter table recruiting_knockout_results
  drop constraint if exists recruiting_knockout_results_tenant_candidate_fk;
alter table recruiting_knockout_results
  add constraint recruiting_knockout_results_tenant_candidate_fk
  foreign key (tenant_id, candidate_id)
  references recruiting_candidates(tenant_id, id)
  on delete cascade
  not valid;

alter table recruiting_documents force row level security;
alter table recruiting_knockout_results force row level security;
