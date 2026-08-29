import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/008_hiring_state_storage_bounds.sql', 'utf8');

assert.match(migration, /tenant_id_length_check[\s\S]*char_length\(tenant_id\) between 1 and 256/i);
assert.match(migration, /state_type_length_check[\s\S]*char_length\(state_type\) between 1 and 128/i);
assert.match(migration, /payload_size_check[\s\S]*pg_column_size\(payload\) <= 65536/i);
assert.match(migration, /drop constraint if exists/i);
assert.match(migration, /add constraint/i);

console.log('Hiring state storage bounds regression passed');
