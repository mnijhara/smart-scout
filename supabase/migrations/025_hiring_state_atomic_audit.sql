-- Make lifecycle state + audit persistence atomic inside one database transaction.
-- The service-role RPC is intentionally not exposed to browser roles.

create or replace function public.persist_hiring_state_with_audit(
  p_tenant_id text,
  p_workflow_id uuid,
  p_candidate_id uuid,
  p_state_type text,
  p_payload jsonb,
  p_actor text
)
returns public.hiring_state_history
language plpgsql
security definer
set search_path = public
as $$
declare
  state_row public.hiring_state_history;
  audit_id text;
begin
  if nullif(btrim(p_tenant_id), '') is null then
    raise exception 'hiring state tenant is required';
  end if;
  if nullif(btrim(p_state_type), '') is null then
    raise exception 'hiring state type is required';
  end if;
  if nullif(btrim(p_actor), '') is null then
    raise exception 'hiring state actor is required';
  end if;
  if length(btrim(p_actor)) > 256 then
    raise exception 'hiring state actor exceeds 256 characters';
  end if;

  insert into public.hiring_state_history (
    tenant_id, workflow_id, candidate_id, state_type, payload
  ) values (
    btrim(p_tenant_id), p_workflow_id, p_candidate_id, btrim(p_state_type), coalesce(p_payload, '{}'::jsonb)
  )
  returning * into state_row;

  audit_id := 'audit_' || gen_random_uuid()::text;
  insert into public.recruiting_audit_events (
    id, tenant_id, job_id, candidate_id, action, actor, metadata
  ) values (
    audit_id,
    state_row.tenant_id,
    state_row.workflow_id::text,
    state_row.candidate_id::text,
    'hiring_state_' || state_row.state_type || '_saved',
    btrim(p_actor),
    jsonb_build_object('stateId', 'state_' || state_row.id::text, 'stateType', state_row.state_type)
  );

  return state_row;
end;
$$;

revoke all on function public.persist_hiring_state_with_audit(text, uuid, uuid, text, jsonb, text) from public, anon, authenticated;

grant execute on function public.persist_hiring_state_with_audit(text, uuid, uuid, text, jsonb, text) to service_role;

comment on function public.persist_hiring_state_with_audit(text, uuid, uuid, text, jsonb, text) is
  'Atomically persists a hiring lifecycle state and its corresponding audit event; failure rolls back both inserts.';
