import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/011_recruiting_audit_query_indexes.sql', 'utf8');

assert.match(migration, /create index if not exists recruiting_audit_events_tenant_workflow_created_at_idx/i);
assert.match(migration, /on recruiting_audit_events\s*\(tenant_id, workflow_id, created_at desc\)/i);
assert.match(migration, /create index if not exists recruiting_audit_events_tenant_candidate_created_at_idx/i);
assert.match(migration, /on recruiting_audit_events\s*\(tenant_id, candidate_id, created_at desc\)/i);

console.log('Audit query index regression passed');
