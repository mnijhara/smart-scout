import fs from 'node:fs/promises';

const source = await fs.readFile('services/recruiting/hiringStateStore.ts', 'utf8');

const required = [
  /client\.rpc\(['"]persist_hiring_state_with_audit['"]/,
  /p_tenant_id:\s*tenantId/,
  /p_workflow_id:\s*workflowUuid\(jobId\)/,
  /p_candidate_id:\s*candidateId\|\|null/,
  /p_state_type:\s*type/,
  /p_payload:\s*payload\|\|\{\}/,
  /p_actor:\s*actor/,
  /if\(!atomic\.error\)\s*return\s+publicState\(atomic\.data\)/,
  /function atomicRpcUnavailable\(error:any\)/,
  /code==='42883'\s*\|\|\s*code==='PGRST202'/,
  /recordLifecycleAudit\(/,
  /hiring_state_history.*delete/s,
];
for (const pattern of required) {
  if (!pattern.test(source)) throw new Error(`Hiring store atomic-audit wiring missing: ${pattern}`);
}

if (!/if\(!atomicRpcUnavailable\(atomic\.error\)\)\s*throw/.test(source)) {
  throw new Error('Hiring store must fail closed for atomic RPC errors other than migration-unavailable compatibility cases');
}

console.log('Hiring-state atomic audit store wiring regression passed.');
