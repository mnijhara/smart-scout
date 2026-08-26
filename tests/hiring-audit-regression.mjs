import fs from 'node:fs/promises';

const store = await fs.readFile('services/recruiting/hiringStateStore.ts', 'utf8');
const audit = await fs.readFile('services/recruiting/auditStore.ts', 'utf8');

const requiredStoreContracts = [
  /recordAuditEvent\(\{tenantId,workflowId:jobId,candidateId:candidateId\|\|null,eventType:`hiring_state_\$\{type\}_saved`/,
  /actorType:'system'/,
  /actorId:'hiring-lifecycle'/,
];
for (const pattern of requiredStoreContracts) {
  if (!pattern.test(store)) throw new Error(`Hiring state audit contract missing: ${pattern}`);
}

const requiredAuditContracts = [
  /from\('recruiting_audit_events'\)/,
  /tenant_id:input\.tenantId/,
  /workflow_id:uuid\(input\.workflowId\)/,
  /candidate_id:uuid\(input\.candidateId\)/,
  /event_type:input\.eventType/,
];
for (const pattern of requiredAuditContracts) {
  if (!pattern.test(audit)) throw new Error(`Audit persistence contract missing: ${pattern}`);
}

console.log('Hiring lifecycle audit regression verification passed');
