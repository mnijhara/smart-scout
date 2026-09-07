import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/candidateStore.ts', import.meta.url), 'utf8');

assert.match(source, /\.from\('recruiting_candidates'\)\.update\(\{status:/, 'candidate status updates must use the recruiting candidates table');
assert.match(source, /\.eq\('tenant_id',tenantId\)\.eq\('id',databaseId\)\.eq\('status',previousStatus\)/, 'candidate status writes must remain tenant-scoped and compare-and-set the previous status');
assert.match(source, /\.from\('recruiting_candidates'\)\.update\(\{score,updated_at:/, 'candidate score updates must use the recruiting candidates table');
assert.match(source, /\.eq\('tenant_id',tenantId\)\.eq\('id',databaseId\)\.select\('\*'\)/, 'candidate score writes must remain tenant-scoped');
assert.match(source, /all\.findIndex\(x=>x\.tenantId===tenantId&&x\.id===candidateId\)/, 'file-backed candidate writes must remain tenant-scoped');

console.log('Candidate-store tenant-scoped write contract: OK');
