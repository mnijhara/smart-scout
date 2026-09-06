import fs from 'node:fs/promises';

const store = await fs.readFile('services/recruiting/hiringStateStore.ts', 'utf8');
const audit = await fs.readFile('services/recruiting/auditStore.ts', 'utf8');

const requiredStoreContracts = [
  /recordLifecycleAudit\(\{tenantId:normalizedTenantId,jobId:normalizedJobId,candidateId:normalizedCandidateId\|\|null,action:`hiring_state_\$\{normalizedType\}_saved`,actor:normalizedActor,metadata:\{stateId:state\.id,stateType:normalizedType\}\}\)/,
  /const normalizedActor=normalizeLifecycleActor\(actor\)/,
  /const normalizedType=type\?\.trim\(\)/,
];
for (const pattern of requiredStoreContracts) {
  if (!pattern.test(store)) throw new Error(`Hiring state audit contract missing: ${pattern}`);
}

const requiredAuditContracts = [
  /from\('recruiting_audit_events'\)/,
  /tenant_id:input\.tenantId\.trim\(\)/,
  /workflow_id:uuid\(input\.workflowId\)/,
  /candidate_id:uuid\(input\.candidateId\)/,
  /event_type:input\.eventType\.trim\(\)/,
  /actor_type:input\.actorType\?\.trim\(\)\|\|'system'/,
  /actor_id:input\.actorId\?\.trim\(\)\|\|null/,
];
for (const pattern of requiredAuditContracts) {
  if (!pattern.test(audit)) throw new Error(`Audit persistence contract missing: ${pattern}`);
}

console.log('Hiring lifecycle audit regression verification passed');
