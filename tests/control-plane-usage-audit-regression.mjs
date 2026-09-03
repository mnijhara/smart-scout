import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

const start = source.indexOf('export async function recordUsage');
assert.notEqual(start, -1, 'recordUsage must remain available');
const end = source.indexOf('export async function usageSummary', start);
assert.notEqual(end, -1, 'usageSummary must follow recordUsage');
const body = source.slice(start, end);

assert.match(body, /requiredIdentity\(actor,'Usage actor'\)/, 'usage persistence must require an explicit actor');
assert.match(body, /await audit\(/, 'usage persistence must emit an audit event');
assert.match(body, /action:'usage_recorded'/, 'usage persistence must use the stable usage_recorded audit action');
assert.match(body, /usageId:value\.id/, 'usage audit metadata must bind to the persisted usage record');
assert.match(body, /period:value\.period/, 'usage audit metadata must preserve the usage period');
assert.match(body, /feature:value\.feature/, 'usage audit metadata must preserve the usage feature');
assert.match(body, /units:value\.units/, 'usage audit metadata must preserve the usage units');

const routeStart = source.indexOf("r.post('/usage'");
assert.notEqual(routeStart, -1, 'usage route must remain available');
const routeEnd = source.indexOf("r.get('/usage'", routeStart);
assert.notEqual(routeEnd, -1, 'usage GET route must follow usage POST route');
const route = source.slice(routeStart, routeEnd);
assert.match(route, /actorFromRequest\(req\)/, 'usage route must derive the audit actor from authenticated workspace identity');
assert.match(route, /recordUsage\(\{\.\.\.req\.body,tenantId:tenant\},actor\)/, 'usage route must pass the authenticated actor into persistence');

console.log('Usage mutations remain audit-covered and bound to the authenticated actor.');
