import fs from 'node:fs/promises';

const read = (name) => fs.readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');

const [storageBounds, identityBounds, candidateIndex] = await Promise.all([
  read('008_hiring_state_storage_bounds.sql'),
  read('010_hiring_state_identity_bounds.sql'),
  read('013_hiring_state_candidate_query_index.sql'),
]);

const required = [
  [storageBounds, /hiring_state_history_payload_size_check/i, 'payload size constraint'],
  [storageBounds, /hiring_state_history_type_length_check/i, 'state type length constraint'],
  [identityBounds, /hiring_state_history_workflow_id_length_check/i, 'workflow identity length constraint'],
  [identityBounds, /hiring_state_history_candidate_id_length_check/i, 'candidate identity length constraint'],
  [candidateIndex, /create\s+index\s+if\s+not\s+exists\s+hiring_state_history_tenant_workflow_type_candidate_idx/i, 'candidate query index'],
  [candidateIndex, /\(tenant_id,\s*workflow_id,\s*state_type,\s*candidate_id,\s*created_at\s+desc\)/i, 'candidate query index column order'],
];

for (const [sql, pattern, label] of required) {
  if (!pattern.test(sql)) throw new Error(`Hiring-state migration regression: missing ${label}`);
}

console.log('Hiring-state migration bounds and candidate-query index regression passed');
