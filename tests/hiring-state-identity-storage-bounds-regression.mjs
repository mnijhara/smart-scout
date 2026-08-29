import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/010_hiring_state_identity_bounds.sql', 'utf8');

assert.match(migration, /workflow_id_length_check[\s\S]*char_length\(workflow_id\) between 1 and 256/i);
assert.match(migration, /candidate_id_length_check[\s\S]*char_length\(candidate_id\) between 1 and 256/i);
assert.match(migration, /candidate_id is null or/i);
assert.match(migration, /drop constraint if exists/i);
assert.match(migration, /add constraint/i);

console.log('Hiring state identity storage bounds regression passed');
