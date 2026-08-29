import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const migration = await fs.readFile(new URL('../supabase/migrations/012_recruiting_rls_defense_in_depth.sql', import.meta.url), 'utf8');

for (const table of ['recruiting_audit_events', 'hiring_state_history']) {
  assert.match(migration, new RegExp(`alter table if exists public\\.${table} enable row level security`, 'i'));
  assert.match(migration, new RegExp(`alter table if exists public\\.${table} force row level security`, 'i'));
}
assert.match(migration, /Do not create permissive client policies/i);
assert.match(migration, /service role server-side/i);

console.log('recruiting RLS regression passed');
