import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authSource = await readFile(new URL('../services/recruiting/firebaseAuth.ts', import.meta.url), 'utf8');
const apiSource = await readFile(new URL('../services/recruiting/api.ts', import.meta.url), 'utf8');

assert.match(
  authSource,
  /\(req as any\)\.firebaseUser\s*=\s*identity;\s*req\.headers\['x-tenant-id'\]\s*=\s*identity\.uid;/,
  'Firebase authentication must bind the authenticated UID to the request tenant context',
);
assert.match(
  authSource,
  /\(req as any\)\.workspaceIdentity\s*=\s*identity;\s*req\.headers\['x-tenant-id'\]\s*=\s*identity\.id;/,
  'workspace authentication must bind the resolved identity to the request tenant context',
);
assert.match(
  authSource,
  /export function authenticatedTenantId\(req:Request\):string\{\s*const identity\s*=\s*\(req as any\)\.workspaceIdentity as WorkspaceIdentity\|undefined;/,
  'authenticatedTenantId must resolve from authenticated server-side identity state',
);
assert.doesNotMatch(
  authSource,
  /export function authenticatedTenantId\(req:Request\):string\{[^}]*req\.header\(/,
  'authenticatedTenantId must not trust a caller-supplied tenant header',
);

assert.match(
  apiSource,
  /function tenantId\(req: any\): string \{ return authenticatedTenantId\(req\); \}/,
  'recruiting routes must consume the server-derived authenticated tenant context',
);
assert.match(
  apiSource,
  /function requireTenantId\(req: any\): string \{[\s\S]*?if \(!tenant\) throw new Error\('Workspace identity is missing'\);/,
  'recruiting mutations must reject requests without authenticated workspace identity',
);

console.log('Authenticated tenant binding regression passed');
