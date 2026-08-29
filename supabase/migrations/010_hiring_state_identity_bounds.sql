alter table public.hiring_state_history
  drop constraint if exists hiring_state_history_workflow_id_length_check,
  drop constraint if exists hiring_state_history_candidate_id_length_check;

alter table public.hiring_state_history
  add constraint hiring_state_history_workflow_id_length_check
  check (char_length(workflow_id) between 1 and 256),
  add constraint hiring_state_history_candidate_id_length_check
  check (candidate_id is null or char_length(candidate_id) between 1 and 256);
