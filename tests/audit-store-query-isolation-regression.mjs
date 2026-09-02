import { promises as fs } from 'node:fs';

const store = await fs.readFile('services/recruiting/auditStore.ts', 'utf8');
const normalized = store.replace(/\s+/g, '');

const listBlock = store.match(/export async function listAuditEvents[\s\S]*?\n}\nexport async function countAuditEvents/)?.[0] || '';
const countBlock = store.match(/export async function countAuditEvents[\s\S]*$/)?.[0] || '';
const normalizedList = listBlock.replace(/\s+/g, '');
const normalizedCount = countBlock.replace(/\s+/g, '');

if (!normalizedList.includes(".eq('tenant_id',normalizedTenantId)") && !normalizedList.includes('.eq("tenant_id",normalizedTenantId)')) {
  throw new Error('Audit reads must always be tenant-scoped');
}
if (!normalizedCount.includes(".eq('tenant_id',normalizedTenantId)") && !normalizedCount.includes('.eq("tenant_id",normalizedTenantId)')) {
  throw new Error('Audit counts must always be tenant-scoped');
}
if (!/if\(normalizedWorkflowId\)query=query\.eq\((['"])workflow_id\1,uuid\(normalizedWorkflowId\)\)/.test(normalizedList)) {
  throw new Error('Audit reads must apply the workflow filter to the database query');
}
if (!/if\(normalizedCandidateId\)query=query\.eq\((['"])candidate_id\1,uuid\(normalizedCandidateId\)\)/.test(normalizedList)) {
  throw new Error('Audit reads must apply the candidate filter to the database query');
}
if (!/if\(normalizedWorkflowId\)query=query\.eq\((['"])workflow_id\1,uuid\(normalizedWorkflowId\)\)/.test(normalizedCount)) {
  throw new Error('Audit counts must apply the workflow filter to the database query');
}
if (!/if\(normalizedCandidateId\)query=query\.eq\((['"])candidate_id\1,uuid\(normalizedCandidateId\)\)/.test(normalizedCount)) {
  throw new Error('Audit counts must apply the candidate filter to the database query');
}
if (!normalized.includes('return{persisted:false}')) {
  throw new Error('Audit persistence must explicitly report an unconfigured provider');
}

console.log('audit-store-query-isolation-regression: ok');
