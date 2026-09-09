import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/candidateStore.ts', import.meta.url), 'utf8');

if (!/\.from\(['"]recruiting_candidates['"]\)\.select\(['"]\*['"]\)\.eq\(['"]tenant_id['"],\s*tenantId\)\.eq\(['"]id['"],\s*databaseId\)/.test(source)) {
  throw new Error('Candidate lifecycle lookup must remain tenant-scoped');
}

if (!/\.update\(\{status:normalizedStatus,updated_at:new Date\(\)\.toISOString\(\)\}\)\.eq\(['"]tenant_id['"],\s*tenantId\)\.eq\(['"]id['"],\s*databaseId\)\.eq\(['"]status['"],\s*previousStatus\)/.test(source)) {
  throw new Error('Candidate lifecycle update must enforce tenant and previous-status guards');
}

if (!/const previousStatus=before\.status;/.test(source) || !/previousStatus!==normalizedStatus/.test(source)) {
  throw new Error('Candidate lifecycle audit must record only real status transitions');
}

console.log('Candidate lifecycle tenant/update guards are present');
