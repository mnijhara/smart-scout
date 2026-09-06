import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync(new URL('../supabase/migrations/025_hiring_state_atomic_audit.sql', import.meta.url), 'utf8');

assert.match(migration, /language\s+plpgsql\s+security\s+definer/i, 'atomic hiring-state RPC must execute with controlled definer privileges');
assert.match(migration, /set\s+search_path\s*=\s*public/i, 'SECURITY DEFINER RPC must pin search_path to prevent object-shadowing attacks');
assert.match(migration, /revoke\s+all\s+on\s+function\s+public\.persist_hiring_state_with_audit\([^)]*\)\s+from\s+public,\s*anon,\s*authenticated/i, 'atomic hiring-state RPC must not be executable by browser roles');
assert.match(migration, /grant\s+execute\s+on\s+function\s+public\.persist_hiring_state_with_audit\([^)]*\)\s+to\s+service_role/i, 'atomic hiring-state RPC must remain callable by the trusted service role');
assert.match(migration, /revoke\s+all\s+on\s+function[\s\S]*grant\s+execute\s+on\s+function[\s\S]*to\s+service_role/i, 'RPC privilege narrowing must precede the service-role grant');

console.log('Hiring-state atomic audit RPC privilege boundary regression passed.');
