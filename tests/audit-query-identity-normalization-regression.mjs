import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const source = await readFile(new URL('../services/recruiting/auditStore.ts', import.meta.url), 'utf8');

assert.match(
  source,
  /const normalizedWorkflowId=workflowId\?\.trim\(\)\|\|null/,
  'audit list/count queries must normalize optional workflow identities before querying'
);
assert.match(
  source,
  /function uuid\(value\?:string\|null\)\{if\(!value\)return null;const normalized=value\.trim\(\)/,
  'audit UUID normalization must trim identifiers before prefix handling'
);
assert.match(
  source,
  /\.eq\('tenant_id',normalizedTenantId\)/,
  'audit reads must use the normalized tenant identity'
);

console.log('audit query identity normalization regression: ok');
