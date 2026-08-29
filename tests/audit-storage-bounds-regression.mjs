import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/009_audit_storage_bounds.sql', import.meta.url), 'utf8');

for (const [name, pattern] of [
  ['tenant id', /char_length\(tenant_id\) between 1 and 256/],
  ['event type', /char_length\(event_type\) between 1 and 128/],
  ['actor type', /char_length\(actor_type\) between 1 and 128/],
  ['actor id', /actor_id is null or char_length\(actor_id\) between 1 and 128/],
  ['provider', /provider is null or char_length\(provider\) between 1 and 128/],
  ['model', /model is null or char_length\(model\) between 1 and 128/],
  ['payload bytes', /octet_length\(payload::text\) <= 65536/],
  ['evidence bytes', /octet_length\(evidence::text\) <= 65536/]
]) {
  assert.match(migration, pattern, `missing ${name} storage bound`);
}

assert.match(migration, /drop constraint if exists recruiting_audit_payload_size/);
assert.match(migration, /add constraint recruiting_audit_payload_size/);
console.log('Audit storage bounds regression passed.');
