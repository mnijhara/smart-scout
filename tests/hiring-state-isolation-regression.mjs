import fs from 'node:fs/promises';

const store = await fs.readFile('services/recruiting/hiringStateStore.ts', 'utf8');

const listBlock = store.match(/export async function listHiringStates[\s\S]*$/)?.[0] || '';
const normalizedList = listBlock.replace(/\s+/g, '');
const tenantScopedRead = /\.eq\((['"])tenant_id\1,normalizedTenantId\)/.test(normalizedList);
const workflowScopedRead = /\.eq\((['"])workflow_id\1,workflowUuid\(normalizedJobId\)\)/.test(normalizedList);
if (!tenantScopedRead) {
  throw new Error('Persistent hiring-state reads must be tenant-scoped');
}
if (!workflowScopedRead) {
  throw new Error('Persistent hiring-state reads must be workflow-scoped');
}

const fallback = listBlock.match(/if\(process\.env\.NODE_ENV\s*===\s*['"]production['"]\)[\s\S]*$/)?.[0] || '';
const normalizedFallback = fallback.replace(/\s+/g, '');
if (!normalizedFallback.includes('all.filter(x=>x.tenantId===normalizedTenantId&&x.jobId===normalizedJobId')) {
  throw new Error('Fallback hiring-state reads must be tenant and workflow scoped');
}

const saveBlock = store.match(/export async function saveHiringState[\s\S]*?\n}\nexport async function listHiringStates/)?.[0] || '';
const normalizedSave = saveBlock.replace(/\s+/g, '');
if (!/tenant_id:normalizedTenantId/.test(normalizedSave) || !/workflow_id:workflowUuid\(normalizedJobId\)/.test(normalizedSave)) {
  throw new Error('Hiring-state writes must persist tenant and workflow identity');
}

console.log('Hiring state tenant/workflow isolation regression verification passed');
