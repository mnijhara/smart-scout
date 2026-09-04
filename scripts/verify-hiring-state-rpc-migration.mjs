import { readFile } from 'node:fs/promises';
import path from 'node:path';

const migrationPath = path.resolve('supabase/migrations/026_hiring_state_rpc_input_bounds.sql');
const migration = await readFile(migrationPath, 'utf8');

const required = [
  /create\s+or\s+replace\s+function\s+public\.persist_hiring_state_with_audit\s*\(/i,
  /security\s+definer/i,
  /set\s+search_path\s*=\s*public/i,
  /if\s+length\(btrim\(p_tenant_id\)\)\s*>\s*256\s+then/i,
  /if\s+length\(btrim\(p_state_type\)\)\s*>\s*128\s+then/i,
  /if\s+length\(btrim\(p_actor\)\)\s*>\s*256\s+then/i,
  /octet_length\(convert_to\(coalesce\(p_payload,\s*'\{\}'::jsonb\)::text,\s*'UTF8'\)\)\s*>\s*65536/i,
  /revoke\s+all\s+on\s+function\s+public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  /grant\s+execute\s+on\s+function\s+public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)\s+to\s+service_role/i,
];

for (const pattern of required) {
  if (!pattern.test(migration)) {
    throw new Error(`Hiring-state RPC migration hardening missing: ${pattern}`);
  }
}

const stateInsert = migration.indexOf('insert into public.hiring_state_history');
const auditInsert = migration.indexOf('insert into public.recruiting_audit_events');
if (stateInsert < 0 || auditInsert < 0 || auditInsert < stateInsert) {
  throw new Error('Hiring-state RPC must persist lifecycle state before its corresponding audit event');
}

console.log('Hiring-state RPC migration verification passed.');
