import fs from 'node:fs';
import assert from 'node:assert/strict';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const controlPlaneMount = server.match(/app\.use\('\/api\/control-plane',[^;]+\);/s)?.[0];
assert.ok(controlPlaneMount, 'control-plane router must be mounted explicitly');

const authIndex = controlPlaneMount.indexOf('requireFirebaseAuth');
const tenantIndex = controlPlaneMount.indexOf('rateLimitTenant');
const rateLimitIndex = controlPlaneMount.indexOf('requireApiRateLimit');
const routerIndex = controlPlaneMount.indexOf('createControlPlaneRouter');

assert.ok(authIndex >= 0, 'control-plane routes must require Firebase authentication');
assert.ok(tenantIndex > authIndex, 'tenant identity must be resolved after authentication');
assert.ok(rateLimitIndex > tenantIndex, 'API rate limiting must run after authenticated tenant resolution');
assert.ok(routerIndex > rateLimitIndex, 'control-plane handlers must run after authentication and rate limiting');

for (const router of ['recruitingRouter', 'documentRouter', 'browserSourceRouter']) {
  const mount = server.match(new RegExp(`app\\.use\\('\\/api\\/recruiting',[^;]*${router}\\);`, 's'))?.[0];
  assert.ok(mount, `${router} must be mounted explicitly under the recruiting API`);
  const auth = mount.indexOf('requireWorkspaceAuth');
  const tenant = mount.indexOf('rateLimitTenant');
  const limit = mount.indexOf('requireApiRateLimit');
  const handler = mount.indexOf(router);
  assert.ok(auth >= 0, `${router} must require workspace authentication`);
  assert.ok(tenant > auth, `${router} tenant identity must be resolved after authentication`);
  assert.ok(limit > tenant, `${router} rate limiting must run after authenticated tenant resolution`);
  assert.ok(handler > limit, `${router} handlers must run after authentication and rate limiting`);
}

assert.equal(server.includes("./server/controlPlaneRouter"), false, 'server.ts must not mount the legacy duplicate control-plane router');

console.log('Recruiting and control-plane API authentication, tenant resolution, rate limiting, and handler ordering are wired safely.');
