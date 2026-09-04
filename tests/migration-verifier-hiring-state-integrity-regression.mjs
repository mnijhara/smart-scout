import fs from 'node:fs/promises';

const verifier = await fs.readFile('scripts/verify-migrations.mjs', 'utf8');

const required = [
  /024_hiring_state_tenant_integrity\.sql/i,
  /hiring_state_history_tenant_workflow_fk/i,
  /hiring_state_history_tenant_candidate_fk/i,
  /hiring_state_history_tenant_workflow_fk_idx/i,
  /hiring_state_history_tenant_candidate_fk_idx/i,
  /hiring_state_history\s+force\s+row\s+level\s+security/i,
];

for (const pattern of required) {
  if (!pattern.test(verifier)) throw new Error(`Migration verifier missing hiring-state tenant integrity coverage: ${pattern}`);
}

console.log('Migration verifier hiring-state tenant integrity coverage verified');
