import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/005_control_plane_actor_constraints.sql', 'utf8');

assert.match(migration, /alter table recruiting_approvals/i);
assert.match(migration, /requested_by_nonblank_check/i);
assert.match(migration, /check \(length\(btrim\(requested_by\)\) between 1 and 256\)/i);
assert.match(migration, /alter table recruiting_audit_events/i);
assert.match(migration, /actor_nonblank_check/i);
assert.match(migration, /check \(length\(btrim\(actor\)\) between 1 and 256\)/i);

console.log('Control-plane actor persistence migration contract regression passed.');
