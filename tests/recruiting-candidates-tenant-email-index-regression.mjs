import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/029_recruiting_candidates_tenant_email_uniqueness.sql', 'utf8');

const dropIndex = migration.search(/drop index if exists public\.recruiting_candidates_email_workflow_idx/i);
const createIndex = migration.search(/create unique index if not exists recruiting_candidates_tenant_email_workflow_idx/i);
assert.notEqual(dropIndex, -1, 'migration must remove the legacy workflow-only uniqueness index');
assert.notEqual(createIndex, -1, 'migration must create the tenant-scoped uniqueness index');
assert.ok(dropIndex < createIndex, 'legacy index must be removed before the replacement is created');
assert.match(migration, /on public\.recruiting_candidates\s*\(tenant_id,\s*workflow_id,\s*lower\(email\)\)/i);
assert.match(migration, /where email is not null/i);
assert.match(migration, /create unique index if not exists/i);

console.log('candidate email tenant-isolation migration contract: PASS');
