import assert from 'node:assert/strict';
import fs from 'node:fs';

const baseline = fs.readFileSync('supabase/migrations/003_control-plane-persistence.sql', 'utf8');
const migration = fs.readFileSync('supabase/migrations/005_control-plane-actor-constraints.sql', 'utf8');

assert.match(baseline, /recruiting_approvals\s*\([\s\S]*?requested_by text not null/i);
assert.match(baseline, /recruiting_audit_events\s*\([\s\S]*?actor text not null/i);

assert.match(migration, /alter table recruiting_approvals/i);
assert.match(migration, /requested_by_nonblank_check/i);
assert.match(migration, /check \(length\(btrim\(requested_by\)\) between 1 and 256\)/i);
assert.match(migration, /alter table recruiting_audit_events/i);
assert.match(migration, /actor_nonblank_check/i);
assert.match(migration, /check \(length\(btrim\(actor\)\) between 1 and 256\)/i);

console.log('Control-plane actor persistence nullability and constraint contract regression passed.');
