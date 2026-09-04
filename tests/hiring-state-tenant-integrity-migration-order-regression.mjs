import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('supabase/migrations');
const migration = await readFile(path.join(root, '024_hiring_state_tenant_integrity.sql'), 'utf8');

const required = [
  /create\s+unique\s+index\s+if\s+not\s+exists\s+hiring_workflows_tenant_id_uidx/i,
  /create\s+unique\s+index\s+if\s+not\s+exists\s+recruiting_candidates_tenant_id_uidx/i,
  /hiring_state_history_tenant_workflow_fk[\s\S]*references\s+public\.hiring_workflows\s*\(tenant_id\s*,\s*id\)[\s\S]*not\s+valid/i,
  /hiring_state_history_tenant_candidate_fk[\s\S]*references\s+public\.recruiting_candidates\s*\(tenant_id\s*,\s*id\)[\s\S]*not\s+valid/i,
  /create\s+index\s+if\s+not\s+exists\s+hiring_state_history_tenant_workflow_fk_idx/i,
  /create\s+index\s+if\s+not\s+exists\s+hiring_state_history_tenant_candidate_fk_idx/i,
  /alter\s+table\s+public\.hiring_state_history\s+force\s+row\s+level\s+security/i,
];

for (const pattern of required) {
  if (!pattern.test(migration)) throw new Error(`Migration 024 dependency/readiness contract missing: ${pattern}`);
}

const workflowMigration = await readFile(path.join(root, '001_hiring_workflows.sql'), 'utf8');
const candidateMigration = await readFile(path.join(root, '002_recruiting_candidates.sql'), 'utf8');
const historyMigration = await readFile(path.join(root, '007_hiring_state_persistence.sql'), 'utf8');
for (const [label, sql] of [['hiring_workflows', workflowMigration], ['recruiting_candidates', candidateMigration], ['hiring_state_history', historyMigration]]) {
  if (!sql.trim()) throw new Error(`Migration dependency ${label} is empty`);
}

console.log('hiring-state-tenant-integrity-migration-order-regression: ok');
