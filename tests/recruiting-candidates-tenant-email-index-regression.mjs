import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/019_recruiting_candidates_tenant_email_uniqueness.sql', 'utf8');

assert.match(migration, /drop index if exists public\.recruiting_candidates_email_workflow_idx/i);
assert.match(migration, /create unique index if not exists recruiting_candidates_tenant_email_workflow_idx/i);
assert.match(migration, /on public\.recruiting_candidates\s*\(tenant_id,\s*workflow_id,\s*lower\(email\)\)/i);
assert.match(migration, /where email is not null/i);

console.log('candidate email tenant-isolation migration contract: PASS');
