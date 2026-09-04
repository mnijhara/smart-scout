import fs from 'node:fs/promises';

const migration = await fs.readFile('supabase/migrations/024_hiring_state_tenant_integrity.sql', 'utf8');

const required = [
  /hiring_state_history_tenant_workflow_fk[\s\S]*foreign\s+key\s*\(tenant_id\s*,\s*workflow_id\)[\s\S]*references\s+public\.hiring_workflows\s*\(tenant_id\s*,\s*id\)[\s\S]*on\s+delete\s+cascade[\s\S]*not\s+valid/i,
  /hiring_state_history_tenant_candidate_fk[\s\S]*foreign\s+key\s*\(tenant_id\s*,\s*candidate_id\)[\s\S]*references\s+public\.recruiting_candidates\s*\(tenant_id\s*,\s*id\)[\s\S]*on\s+delete\s+set\s+null[\s\S]*not\s+valid/i,
  /create\s+unique\s+index\s+if\s+not\s+exists\s+hiring_workflows_tenant_id_uidx/i,
  /create\s+unique\s+index\s+if\s+not\s+exists\s+recruiting_candidates_tenant_id_uidx/i,
  /create\s+index\s+if\s+not\s+exists\s+hiring_state_history_tenant_workflow_fk_idx/i,
  /create\s+index\s+if\s+not\s+exists\s+hiring_state_history_tenant_candidate_fk_idx/i,
  /alter\s+table\s+public\.hiring_state_history\s+force\s+row\s+level\s+security/i,
];

for (const pattern of required) {
  if (!pattern.test(migration)) throw new Error(`Hiring state tenant integrity wiring missing: ${pattern}`);
}

console.log('Hiring state tenant integrity wiring contract verified');
