import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const names = (await readdir(migrationsDir.pathname)).filter(name => name.endsWith('.sql')).sort();
const indexMigration = names.find(name => name.endsWith('recruiting_audit_candidate_workflow_index.sql'));
assert.ok(indexMigration, 'candidate/workflow audit index migration must exist');

const sql = await readFile(path.join(migrationsDir.pathname, indexMigration), 'utf8');
assert.match(
  sql,
  /create\s+index\s+if\s+not\s+exists\s+recruiting_audit_events_tenant_workflow_candidate_created_at_idx/i,
  'audit query index must be created idempotently',
);
assert.match(
  sql,
  /on\s+recruiting_audit_events\s*\(\s*tenant_id\s*,\s*workflow_id\s*,\s*candidate_id\s*,\s*created_at\s+desc\s*\)/i,
  'audit query index must match tenant/workflow/candidate/time query shape',
);

const coreMigration = names.find(name => name.includes('recruiting') && name.includes('audit') && !name.includes('candidate_workflow_index'));
if (coreMigration) {
  const coreIndex = names.indexOf(coreMigration);
  const candidateIndex = names.indexOf(indexMigration);
  assert.ok(candidateIndex > coreIndex, 'candidate/workflow audit index must run after the audit table migration');
}

console.log('Audit candidate/workflow index readiness regression passed');
