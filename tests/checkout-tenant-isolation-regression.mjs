import fs from 'node:fs';
import assert from 'node:assert/strict';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

assert.match(server, /const tenant = tenantId\(req\);/, 'checkout status must resolve the authenticated tenant');
assert.match(server, /session\.metadata\?\.tenantId \|\| ''\) !== tenant/, 'checkout status must reject sessions belonging to another tenant');
assert.match(server, /res\.status\(403\)\.json\(\{ error: 'Checkout session does not belong to this workspace' \}\)/, 'cross-tenant checkout access must return a stable authorization error');

console.log('Checkout session tenant isolation contract: OK');
