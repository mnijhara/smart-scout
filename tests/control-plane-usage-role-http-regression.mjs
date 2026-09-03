import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');
const route = "r.post('/usage'";
const start = source.indexOf(route);
assert.notEqual(start, -1, `missing route: ${route}`);
const end = source.indexOf("});", start);
assert.notEqual(end, -1, `could not locate route boundary: ${route}`);
const body = source.slice(start, end);

assert.match(body, /actorFromRequest\(req\)/, 'usage mutation must require an authenticated actor');
assert.match(body, /requireRecruitingRole\(req\)/, 'usage mutation must enforce a privileged recruiting role');
assert.match(body, /recordUsage\(\{\.\.\.req\.body,tenantId:tenant\},actor\)/, 'usage persistence must receive the authenticated actor');
assert.doesNotMatch(body, /req\.body\??\.actor|req\.body\??\.role/, 'usage authorization must not trust request input');

console.log('Usage mutations enforce authenticated privileged recruiting roles and actor propagation.');
