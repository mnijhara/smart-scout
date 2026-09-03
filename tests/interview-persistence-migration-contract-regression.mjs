import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.resolve('supabase/migrations/006_recruiting_interviews.sql'),
  'utf8',
);

assert.match(migration, /create table if not exists public\.recruiting_interviews/i);
for (const column of [
  'tenant_id',
  'workflow_id',
  'candidate_id',
  'plan',
  'answers',
  'evidence',
  'status',
  'created_at',
  'updated_at',
]) {
  assert.match(migration, new RegExp(`\\b${column}\\b`, 'i'), `missing interview column: ${column}`);
}

assert.match(
  migration,
  /unique\s*\(\s*tenant_id\s*,\s*workflow_id\s*,\s*candidate_id\s*\)/i,
  'interview persistence must prevent duplicate tenant/workflow/candidate rows',
);
assert.match(
  migration,
  /recruiting_interviews_tenant_workflow_idx/i,
  'interview persistence must index tenant/workflow lookups',
);
assert.match(
  migration,
  /recruiting_interviews_tenant_candidate_idx/i,
  'interview persistence must index tenant/candidate lookups',
);

console.log('Interview persistence migration contract is present and query-ready.');
