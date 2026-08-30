import fs from 'node:fs';

const source = fs.readFileSync(new URL('../services/recruiting/auditStore.ts', import.meta.url), 'utf8');

if (!source.includes('countAuditEvents(tenantId:string,workflowId?:string|null,candidateId?:string|null)')) {
  throw new Error('countAuditEvents must accept candidateId for candidate-scoped audit coverage');
}
if (!source.includes("requireOptionalIdentity('candidateId',candidateId)")) {
  throw new Error('countAuditEvents must validate candidateId when provided');
}
if (!source.includes('const normalizedCandidateId=candidateId?.trim()||null')) {
  throw new Error('countAuditEvents must normalize candidateId');
}
if (!source.includes("query=query.eq('candidate_id',uuid(normalizedCandidateId))")) {
  throw new Error('countAuditEvents must scope database counts by candidate_id');
}

console.log('audit candidate count regression: passed');
