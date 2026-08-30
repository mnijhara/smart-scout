import fs from 'node:fs';

const source = fs.readFileSync(new URL('../services/recruiting/auditStore.ts', import.meta.url), 'utf8');

if (!source.includes('listAuditEvents(tenantId:string,workflowId?:string|null,candidateId?:string|null)')) {
  throw new Error('listAuditEvents must accept candidateId for candidate-scoped audit reads');
}
if (!source.includes("requireOptionalIdentity('candidateId',candidateId)")) {
  throw new Error('listAuditEvents must validate candidateId when provided');
}
if (!source.includes('const normalizedCandidateId=candidateId?.trim()||null')) {
  throw new Error('listAuditEvents must normalize candidateId');
}
if (!source.includes("query=query.eq('candidate_id',uuid(normalizedCandidateId))")) {
  throw new Error('listAuditEvents must scope database reads by candidate_id');
}

const countStart = source.indexOf('export async function countAuditEvents');
if (countStart < 0 || !source.slice(countStart).includes("query=query.eq('candidate_id',uuid(normalizedCandidateId))")) {
  throw new Error('countAuditEvents must scope database counts by candidate_id');
}

console.log('audit database candidate query regression: passed');
