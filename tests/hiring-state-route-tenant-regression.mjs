import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const apiPath = path.resolve(process.cwd(), 'services/recruiting/api.ts');
const source = fs.readFileSync(apiPath, 'utf8');

const requiredTenantRoutes = [
  "router.post('/decision'",
  "router.post('/compensation/recommend'",
  "router.post('/offer/draft'",
  "router.post('/offer/transition'",
  "router.post('/engagement/plan'",
  "router.post('/onboarding/plan'",
];

for (const route of requiredTenantRoutes) {
  const start = source.indexOf(route);
  assert.notEqual(start, -1, `${route} must exist`);
  const nextRoute = source.indexOf('\nrouter.', start + route.length);
  const handler = source.slice(start, nextRoute === -1 ? source.length : nextRoute);
  assert.match(handler, /tenantId\(req\)/, `${route} must resolve workspace identity from the request`);
}

// Guard against state reads/writes accidentally becoming globally scoped.
assert.match(source, /saveHiringState\(tenantId\(req\),/);
assert.match(source, /listHiringStates\(tenantId\(req\),/);
assert.match(source, /listApprovals\(tenantId\(req\),/);

console.log('Hiring state route tenant isolation regression passed');
