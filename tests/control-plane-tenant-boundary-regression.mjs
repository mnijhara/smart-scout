import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

const routerBody = source.slice(source.indexOf('export function createControlPlaneRouter'));
const routes = [
  /r\.post\('\/approvals'/,
  /r\.get\('\/approvals'/,
  /r\.post\('\/approvals\/:id\/decision'/,
  /r\.get\('\/audit'/,
  /r\.get\('\/audit\/count'/,
  /r\.post\('\/audit'/,
  /r\.post\('\/schedules'/,
  /r\.get\('\/schedules'/,
  /r\.post\('\/schedules\/:id\/status'/,
  /r\.post\('\/usage'/,
  /r\.get\('\/usage'/,
];

for (const route of routes) assert.match(routerBody, route, `expected route ${route}`);

const resolveTenantCount = (routerBody.match(/resolveTenant\(req\)/g) || []).length;
assert.ok(
  resolveTenantCount >= routes.length,
  `every control-plane route must resolve tenant identity; found ${resolveTenantCount} uses for ${routes.length} routes`,
);

assert.match(
  routerBody,
  /const resolveTenant=\(req:any\)=>requiredIdentity\(tenantId\(req\),'Tenant identity'\);/,
  'control-plane router must normalize and reject missing tenant identity',
);

assert.doesNotMatch(
  routerBody,
  /req\.body\.tenantId/,
  'tenant identity must come from the authenticated request resolver, never the request body',
);

console.log('Control-plane tenant boundary regression passed');
