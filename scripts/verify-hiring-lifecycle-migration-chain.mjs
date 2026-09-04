import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('supabase/migrations');
const readMigration = async (name) => readFile(path.join(root, name), 'utf8');

const tenantIntegrity = await readMigration('024_hiring_state_tenant_integrity.sql');
const atomicAudit = await readMigration('025_hiring_state_atomic_audit.sql');
const inputBounds = await readMigration('026_hiring_state_rpc_input_bounds.sql');

const requirePatterns = (source, label, patterns) => {
  for (const pattern of patterns) {
    if (!pattern.test(source)) throw new Error(`${label} contract missing: ${pattern}`);
  }
};

requirePatterns(tenantIntegrity, '024 hiring-state tenant integrity', [
  /create\s+unique\s+index\s+if\s+not\s+exists\s+hiring_workflows_tenant_id_uidx/i,
  /create\s+unique\s+index\s+if\s+not\s+exists\s+recruiting_candidates_tenant_id_uidx/i,
  /hiring_state_history_tenant_workflow_fk[\s\S]*foreign\s+key\s*\(tenant_id,\s*workflow_id\)[\s\S]*references\s+public\.hiring_workflows\s*\(tenant_id,\s*id\)[\s\S]*not\s+valid/i,
  /hiring_state_history_tenant_candidate_fk[\s\S]*foreign\s+key\s*\(tenant_id,\s*candidate_id\)[\s\S]*references\s+public\.recruiting_candidates\s*\(tenant_id,\s*id\)[\s\S]*not\s+valid/i,
  /alter\s+table\s+public\.hiring_state_history\s+force\s+row\s+level\s+security/i,
]);

requirePatterns(atomicAudit, '025 atomic hiring-state audit', [
  /create\s+or\s+replace\s+function\s+public\.persist_hiring_state_with_audit\s*\(/i,
  /returns\s+public\.hiring_state_history/i,
  /language\s+plpgsql/i,
  /security\s+definer/i,
  /set\s+search_path\s*=\s*public/i,
  /insert\s+into\s+public\.hiring_state_history[\s\S]*returning\s+\*\s+into\s+state_row/i,
  /insert\s+into\s+public\.recruiting_audit_events/i,
  /revoke\s+all\s+on\s+function\s+public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  /grant\s+execute\s+on\s+function\s+public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)\s+to\s+service_role/i,
]);

requirePatterns(inputBounds, '026 hiring-state RPC input bounds', [
  /create\s+or\s+replace\s+function\s+public\.persist_hiring_state_with_audit\s*\(/i,
  /length\(btrim\(p_tenant_id\)\)\s*>\s*256/i,
  /length\(btrim\(p_state_type\)\)\s*>\s*128/i,
  /length\(btrim\(p_actor\)\)\s*>\s*256/i,
  /octet_length\(convert_to\(/i,
]);

const stateInsert = atomicAudit.indexOf('insert into public.hiring_state_history');
const auditInsert = atomicAudit.indexOf('insert into public.recruiting_audit_events');
if (stateInsert < 0 || auditInsert < 0 || auditInsert < stateInsert) {
  throw new Error('025 must write the lifecycle state before its corresponding audit event');
}

const migrationFiles = ['024_hiring_state_tenant_integrity.sql', '025_hiring_state_atomic_audit.sql', '026_hiring_state_rpc_input_bounds.sql'];
for (let i = 0; i < migrationFiles.length; i += 1) {
  const previousVersion = Number(migrationFiles[i - 1]?.match(/^(\d+)_/)?.[1] ?? 23);
  const currentVersion = Number(migrationFiles[i].match(/^(\d+)_/)?.[1]);
  if (currentVersion !== previousVersion + 1) throw new Error(`Hiring lifecycle migration sequence broken before ${migrationFiles[i]}`);
}

console.log('Hiring lifecycle migration chain verification passed.');
