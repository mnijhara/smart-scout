import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('supabase/migrations');
const migrationFiles = [
  '024_hiring_state_tenant_integrity.sql',
  '025_hiring_state_atomic_audit.sql',
  '026_hiring_state_rpc_input_bounds.sql',
];
const readMigration = async (name) => readFile(path.join(root, name), 'utf8');

for (const name of migrationFiles) {
  await access(path.join(root, name));
}

const [tenantIntegrity, atomicAudit, inputBounds] = await Promise.all(migrationFiles.map(readMigration));

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

const lifecycleRpcSignature = /public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)/i;

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
  /returns\s+public\.hiring_state_history/i,
  /language\s+plpgsql/i,
  /security\s+definer/i,
  /set\s+search_path\s*=\s*public/i,
  /length\(btrim\(p_tenant_id\)\)\s*>\s*256/i,
  /length\(btrim\(p_state_type\)\)\s*>\s*128/i,
  /length\(btrim\(p_actor\)\)\s*>\s*256/i,
  /octet_length\(convert_to\(/i,
  /revoke\s+all\s+on\s+function\s+public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  /grant\s+execute\s+on\s+function\s+public\.persist_hiring_state_with_audit\(text,\s*uuid,\s*uuid,\s*text,\s*jsonb,\s*text\)\s+to\s+service_role/i,
  /comment\s+on\s+function\s+public\.persist_hiring_state_with_audit[\s\S]*atomically\s+persists/i,
]);

const stateInsert = /insert\s+into\s+public\.hiring_state_history/i.exec(atomicAudit)?.index ?? -1;
const auditInsert = /insert\s+into\s+public\.recruiting_audit_events/i.exec(atomicAudit)?.index ?? -1;
if (stateInsert < 0 || auditInsert < 0 || auditInsert < stateInsert) {
  throw new Error('025 must write the lifecycle state before its corresponding audit event');
}

const firstValidation = /if\s+nullif\(btrim\(p_tenant_id\),\s*''\)\s+is\s+null\s+then/i.exec(inputBounds)?.index ?? -1;
const boundedInsert = /insert\s+into\s+public\.hiring_state_history/i.exec(inputBounds)?.index ?? -1;
if (firstValidation < 0 || boundedInsert < 0 || firstValidation > boundedInsert) {
  throw new Error('026 must validate lifecycle inputs before writing state');
}

if (!lifecycleRpcSignature.test(inputBounds)) {
  throw new Error('026 must preserve the canonical hiring-state RPC signature');
}

for (let i = 0; i < migrationFiles.length; i += 1) {
  const currentVersion = Number(migrationFiles[i].match(/^(\d+)_/)?.[1]);
  const expectedVersion = 24 + i;
  if (currentVersion !== expectedVersion) {
    throw new Error(`Hiring lifecycle migration sequence broken: expected ${expectedVersion}, found ${currentVersion}`);
  }
}

console.log('Hiring lifecycle migration chain verification passed.');
