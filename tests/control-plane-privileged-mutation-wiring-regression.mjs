import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

const scheduleRoute = "r.post('/schedules'";
const scheduleStatusRoute = "r.post('/schedules/:id/status'";
const auditWriteRoute = "r.post('/audit'";
const usageWriteRoute = "r.post('/usage'";

function routeBody(route) {
  const start = source.indexOf(route);
  assert.notEqual(start, -1, `missing route: ${route}`);
  const end = source.indexOf("});", start);
  assert.notEqual(end, -1, `could not locate route boundary: ${route}`);
  return source.slice(start, end);
}

for (const route of [scheduleRoute, scheduleStatusRoute, auditWriteRoute, usageWriteRoute]) {
  const body = routeBody(route);
  assert.match(body, /requireRecruitingRole\(req\)/, `${route} must enforce a privileged recruiting role`);
  assert.match(body, /workspaceIdentity/, `${route} must use authenticated workspace identity`);
}

console.log('Privileged control-plane mutation routes require authenticated recruiting roles.');
