import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const apiPath = path.resolve(process.cwd(), 'services/recruiting/api.ts');
const source = fs.readFileSync(apiPath, 'utf8');

const connectStart = source.indexOf("router.post('/ai/connect'");
assert.notEqual(connectStart, -1);
const connectEnd = source.indexOf("\nrouter.", connectStart + 1);
const connectRoute = source.slice(connectStart, connectEnd === -1 ? source.length : connectEnd);
assert.match(connectRoute, /const tenant = requireTenantId\(req\);/);
assert.match(connectRoute, /saveAICredential\(tenant, provider, credential\)/);

const statusStart = source.indexOf("router.get('/ai/status'");
assert.notEqual(statusStart, -1);
const statusEnd = source.indexOf("\nrouter.", statusStart + 1);
const statusRoute = source.slice(statusStart, statusEnd === -1 ? source.length : statusEnd);
assert.match(statusRoute, /const tenant = requireTenantId\(req\)/);
assert.match(statusRoute, /listAIProviders\(tenant\)/);

const disconnectStart = source.indexOf("router.delete('/ai/disconnect'");
assert.notEqual(disconnectStart, -1);
const disconnectEnd = source.indexOf("\nrouter.", disconnectStart + 1);
const disconnectRoute = source.slice(disconnectStart, disconnectEnd === -1 ? source.length : disconnectEnd);
assert.match(disconnectRoute, /const tenant = requireTenantId\(req\)/);
assert.match(disconnectRoute, /deleteAICredential\(tenant, p\)/);

assert.match(source, /function requireTenantId\(req: any\): string/);
assert.match(source, /if \(!tenant\) throw new Error\('Workspace identity is missing'\)/);

console.log('AI credential workspace isolation regression passed');
