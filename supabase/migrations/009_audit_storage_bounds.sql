alter table recruiting_audit_events
  drop constraint if exists recruiting_audit_tenant_id_length,
  drop constraint if exists recruiting_audit_event_type_length,
  drop constraint if exists recruiting_audit_actor_type_length,
  drop constraint if exists recruiting_audit_actor_id_length,
  drop constraint if exists recruiting_audit_provider_length,
  drop constraint if exists recruiting_audit_model_length,
  drop constraint if exists recruiting_audit_payload_size,
  drop constraint if exists recruiting_audit_evidence_size;

alter table recruiting_audit_events
  add constraint recruiting_audit_tenant_id_length check (char_length(tenant_id) between 1 and 256),
  add constraint recruiting_audit_event_type_length check (char_length(event_type) between 1 and 128),
  add constraint recruiting_audit_actor_type_length check (char_length(actor_type) between 1 and 128),
  add constraint recruiting_audit_actor_id_length check (actor_id is null or char_length(actor_id) between 1 and 128),
  add constraint recruiting_audit_provider_length check (provider is null or char_length(provider) between 1 and 128),
  add constraint recruiting_audit_model_length check (model is null or char_length(model) between 1 and 128),
  add constraint recruiting_audit_payload_size check (octet_length(payload::text) <= 65536),
  add constraint recruiting_audit_evidence_size check (octet_length(evidence::text) <= 65536);
