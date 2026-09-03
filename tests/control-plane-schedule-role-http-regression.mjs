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

for (const route of ["r.post('/schedules'", "r.post('/schedules/:id/status'"]) {
  const body = routeBody(route);
  assert.match(body, /actorFromRequest\(req\)/, `${route} must require an authenticated actor`);
  assert.match(body, /requireRecruitingRole\(req\)/, `${route} must enforce a privileged recruiting role`);
  assert.match(body, /forbidden\?403/, `${route} must map insufficient permissions to HTTP 403`);
  assert.doesNotMatch(body, /req\.body\??\.actor|req\.body\??\.role/, `${route} must not authorize from request input`);
}

console.log('Interview scheduling mutations enforce authenticated privileged recruiting roles.');
