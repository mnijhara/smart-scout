import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/candidateStore.ts', import.meta.url), 'utf8');

if (!/\.from\(['"]recruiting_candidates['"]\)\.select\(['"]\*['"]\)\.eq\(['"]tenant_id['"],\s*tenantId\)\.eq\(['"]id['"],\s*databaseId\)/.test(source)) {
  throw new Error('Candidate score lookup must remain tenant-scoped');
}

if (!/\.update\(\{score:nextScore,updated_at:new Date\(\)\.toISOString\(\)\}\)\.eq\(['"]tenant_id['"],\s*tenantId\)\.eq\(['"]id['"],\s*databaseId\)/.test(source)) {
  throw new Error('Candidate score update must enforce tenant and candidate identity guards');
}

if (!/await appendCandidateAudit\(tenantId,\s*databaseId,\s*['"]candidate_score_updated['"]/.test(source)) {
  throw new Error('Candidate score audit must retain the tenant-scoped audit identity');
}

console.log('Candidate score tenant guards are present');
