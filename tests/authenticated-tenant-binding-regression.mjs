import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authSource = await readFile(new URL('../services/recruiting/firebaseAuth.ts', import.meta.url), 'utf8');
const apiSource = await readFile(new URL('../services/recruiting/api.ts', import.meta.url), 'utf8');

assert.match(
  authSource,
  /\(req as any\)\.firebaseUser=identity;\s*req\.headers\['x-tenant-id'\]=identity\.uid;/,
  'Firebase authentication must bind the authenticated UID to the request tenant context',
);
assert.match(
  authSource,
  /\(req as any\)\.workspaceIdentity=identity;\s*req\.headers\['x-tenant-id'\]=identity\.id;/,
  'workspace authentication must bind the resolved identity to the request tenant context',
);
assert.match(
  authSource,
  /export function authenticatedTenantId\(req:Request\):string\{const identity=\(req as any\)\.workspaceIdentity as WorkspaceIdentity\|undefined;/,
  'authenticatedTenantId must resolve from authenticated server-side identity state',
);
assert.doesNotMatch(
  authSource,
  /export function authenticatedTenantId\(req:Request\):string\{[^}]*req\.header\(/,
  'authenticatedTenantId must not trust a caller-supplied tenant header',
);

assert.match(
  apiSource,
  /function tenantId\(req: any\): string \{ return String\(req\.header\('x-tenant-id'\) \|\| ''\); \}/,
  'recruiting routes may consume the tenant context only after authentication middleware binds it',
);

console.log('Authenticated tenant binding regression passed');
