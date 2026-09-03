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

// Approval mutations already enforce privileged recruiting roles. Keep that boundary
// explicit while also ensuring the remaining control-plane mutations derive their
// actor from the authenticated workspace identity rather than request input.
for (const route of ["r.post('/approvals'", "r.post('/approvals/:id/decision'"]) {
  const body = routeBody(route);
  assert.match(body, /requireRecruitingRole\(req\)/, `${route} must enforce a privileged recruiting role`);
}

for (const route of ["r.post('/schedules'", "r.post('/schedules/:id/status'", "r.post('/audit'", "r.post('/usage'"]) {
  const body = routeBody(route);
  assert.match(body, /workspaceIdentity/, `${route} must derive request context from authenticated workspace identity`);
}

console.log('Control-plane privileged and authenticated mutation boundaries remain wired.');
