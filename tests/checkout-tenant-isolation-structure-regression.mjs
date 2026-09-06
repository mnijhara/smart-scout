import fs from 'node:fs';
import assert from 'node:assert/strict';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

const route = server.match(/app\.get\('\/api\/checkout\/session-status',[\s\S]*?\n\s*\}\);/);
assert.ok(route, 'checkout session-status route must remain present');
const source = route[0];

assert.match(source, /const tenant = tenantId\(req\);/, 'checkout status must resolve the authenticated tenant');
assert.match(source, /session\.metadata\?\.tenantId \|\| ''\) !== tenant/, 'checkout status must compare the session tenant to the authenticated tenant');
assert.match(source, /res\.status\(403\)\.json\(\{ error: 'Checkout session does not belong to this workspace' \}\)/, 'cross-tenant checkout access must return a stable authorization error');
assert.ok(source.indexOf('const tenant = tenantId(req);') < source.indexOf('session.metadata?.tenantId || \'\') !== tenant'), 'tenant authorization must happen before session data is returned');

console.log('Checkout session tenant-isolation route ordering contract: OK');
