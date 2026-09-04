import fs from 'node:fs/promises';

const migration = await fs.readFile('supabase/migrations/026_hiring_state_rpc_input_bounds.sql', 'utf8');

const required = [
  /create\s+or\s+replace\s+function\s+public\.persist_hiring_state_with_audit\s*\(/i,
  /security\s+definer/i,
  /set\s+search_path\s*=\s*public/i,
  /if\s+length\(btrim\(p_tenant_id\)\)\s*>\s*256\s+then/i,
  /hiring state tenant exceeds 256 characters/i,
  /if\s+length\(btrim\(p_state_type\)\)\s*>\s*128\s+then/i,
  /hiring state type exceeds 128 characters/i,
  /if\s+length\(btrim\(p_actor\)\)\s*>\s*256\s+then/i,
  /hiring state actor exceeds 256 characters/i,
  /octet_length\(convert_to\(coalesce\(p_payload, '\{\}'::jsonb\)::text,\s*'UTF8'\)\)\s*>\s*65536/i,
  /hiring state payload exceeds 65536 bytes/i,
  /revoke\s+all\s+on\s+function\s+public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  /grant\s+execute\s+on\s+function\s+public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)\s+to\s+service_role/i,
];
for (const pattern of required) if (!pattern.test(migration)) throw new Error(`Atomic hiring-state RPC input-boundary contract missing: ${pattern}`);

if (migration.indexOf('insert into public.hiring_state_history') < 0 || migration.indexOf('insert into public.recruiting_audit_events') < 0) {
  throw new Error('Bounded atomic RPC must preserve both state and audit persistence');
}

console.log('Hiring-state RPC input bounds regression passed.');
