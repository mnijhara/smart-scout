import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

function routeBody(route) {
  const start = source.indexOf(route);
  assert.notEqual(start, -1, `missing route: ${route}`);
  const end = source.indexOf("});", start);
  assert.notEqual(end, -1, `could not locate route boundary: ${route}`);
  return source.slice(start, end);
}

// Approval mutations enforce privileged recruiting roles. Other mutating control-plane
// routes must derive their actor/context from authenticated workspace identity rather
// than request input or tenant-only caller data.
for (const route of ["r.post('/approvals'", "r.post('/approvals/:id/decision'"]) {
  const body = routeBody(route);
  assert.match(body, /requireRecruitingRole\(req\)/, `${route} must enforce a privileged recruiting role`);
}

for (const route of ["r.post('/schedules'", "r.post('/schedules/:id/status'", "r.post('/audit'", "r.post('/usage'"]) {
  const body = routeBody(route);
  assert.match(body, /workspaceIdentity/, `${route} must derive request context from authenticated workspace identity`);
}

assert.match(
  routeBody("r.post('/usage'"),
  /actorFromRequest\(req\)/,
  "usage mutations must require an authenticated actor before persistence",
);

console.log('Control-plane privileged and authenticated mutation boundaries remain wired.');
