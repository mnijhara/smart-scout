import fs from 'node:fs';

const workflowPath = '.github/workflows/production-gates.yml';
const workflow = fs.readFileSync(workflowPath, 'utf8');

const migrationGate = workflow.indexOf('run: node scripts/verify-hiring-lifecycle-migration-chain.mjs');
const persistenceGate = workflow.indexOf('name: Hiring state persistence and audit regression');
const rollbackGate = workflow.indexOf('name: Hiring state audit rollback regression');
const actorGate = workflow.indexOf('name: Hiring state audit actor regression');

if (migrationGate < 0) throw new Error('Production gates must execute the hiring lifecycle migration-chain verifier');
if (persistenceGate < 0) throw new Error('Production gates must retain hiring state persistence/audit coverage');
if (rollbackGate < 0) throw new Error('Production gates must retain hiring audit rollback coverage');
if (actorGate < 0) throw new Error('Production gates must retain hiring audit actor coverage');

for (const [name, position] of [
  ['persistence/audit', persistenceGate],
  ['audit rollback', rollbackGate],
  ['audit actor', actorGate],
]) {
  if (migrationGate > position) {
    throw new Error(`Hiring migration-chain verification must run before ${name} regression`);
  }
}

console.log('PRODUCTION_GATES_HIRING_CHAIN_ORDER_OK');
