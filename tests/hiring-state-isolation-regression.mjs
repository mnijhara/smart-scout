import fs from 'node:fs/promises';

const store = await fs.readFile('services/recruiting/hiringStateStore.ts', 'utf8');

const listBlock = store.match(/export async function listHiringStates[\s\S]*$/)?.[0] || '';
if (!/eq\('tenant_id',tenantId\)/.test(listBlock)) {
  throw new Error('Persistent hiring-state reads must be tenant-scoped');
}
if (!/eq\('workflow_id',workflowUuid\(jobId\)\)/.test(listBlock)) {
  throw new Error('Persistent hiring-state reads must be workflow-scoped');
}

const fallback = listBlock.match(/if\(process\.env\.NODE_ENV==='production'\)[\s\S]*$/)?.[0] || '';
if (!/all\.filter\(x=>x\.tenantId===tenantId&&x\.jobId===jobId/.test(fallback)) {
  throw new Error('Fallback hiring-state reads must be tenant and workflow scoped');
}

const saveBlock = store.match(/export async function saveHiringState[\s\S]*?\n}\nexport async function listHiringStates/)?.[0] || '';
if (!/tenant_id:tenantId/.test(saveBlock) || !/workflow_id:workflowUuid\(jobId\)/.test(saveBlock)) {
  throw new Error('Hiring-state writes must persist tenant and workflow identity');
}

console.log('Hiring state tenant/workflow isolation regression verification passed');
