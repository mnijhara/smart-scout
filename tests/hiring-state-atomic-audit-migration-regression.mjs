import fs from 'node:fs/promises';

const migration = await fs.readFile('supabase/migrations/025_hiring_state_atomic_audit.sql', 'utf8');

const required = [
  /create\s+or\s+replace\s+function\s+public\.persist_hiring_state_with_audit\s*\(/i,
  /returns\s+public\.hiring_state_history/i,
  /language\s+plpgsql/i,
  /security\s+definer/i,
  /set\s+search_path\s*=\s*public/i,
  /insert\s+into\s+public\.hiring_state_history/i,
  /insert\s+into\s+public\.recruiting_audit_events/i,
  /hiring_state_.*_saved/i,
  /revoke\s+all\s+on\s+function\s+public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  /grant\s+execute\s+on\s+function\s+public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)\s+to\s+service_role/i,
];
for (const pattern of required) if (!pattern.test(migration)) throw new Error(`Atomic hiring-state audit contract missing: ${pattern}`);

const stateInsert = migration.indexOf('insert into public.hiring_state_history');
const auditInsert = migration.indexOf('insert into public.recruiting_audit_events');
if (stateInsert < 0 || auditInsert < 0 || stateInsert > auditInsert) throw new Error('Atomic lifecycle function must persist state before its audit event');
if (!/return\s+state_row\s*;/i.test(migration)) throw new Error('Atomic lifecycle function must return the persisted state');

console.log('Hiring-state atomic audit migration regression passed.');
