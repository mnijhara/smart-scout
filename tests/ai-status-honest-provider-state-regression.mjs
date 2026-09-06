import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const apiPath = path.resolve(process.cwd(), 'services/recruiting/api.ts');
const source = fs.readFileSync(apiPath, 'utf8');
const statusStart = source.indexOf("router.get('/ai/status'");
assert.notEqual(statusStart, -1);
const statusEnd = source.indexOf("\nrouter.", statusStart + 1);
const statusRoute = source.slice(statusStart, statusEnd === -1 ? source.length : statusEnd);

assert.match(statusRoute, /const tenant = requireTenantId\(req\);/);
assert.match(statusRoute, /const session = sessions\.get\(tenant\);/);
assert.match(statusRoute, /if \(session\) return res\.json\(\{ connected: true/);
assert.match(statusRoute, /if \(process\.env\.GEMINI_API_KEY\) return res\.json\(\{ connected: true/);
assert.match(statusRoute, /const providers = await listAIProviders\(tenant\)/);
assert.match(statusRoute, /if \(providers\[0\]\) return res\.json\(\{ connected: true/);
assert.match(statusRoute, /res\.json\(\{ connected: false, provider: null, model: null \}\)/);

// Provider records must be scoped to the authenticated tenant. A global
// provider lookup would let one workspace inherit another workspace's
// configured AI state.
const providerLookup = statusRoute.match(/const providers = await listAIProviders\(tenant\)/g) || [];
assert.equal(providerLookup.length, 1, 'AI status must query provider configuration for the authenticated tenant');
assert.doesNotMatch(statusRoute, /listAIProviders\(\)/);
assert.doesNotMatch(statusRoute, /listAIProviders\([^)]*process\.env/);

// A provider must be backed by a real session, server credential, or tenant
// credential record. The fallback must remain explicitly disconnected rather
// than inventing a provider/model when no configuration exists.
const connectedBranches = (statusRoute.match(/connected: true/g) || []).length;
assert.equal(connectedBranches, 3, 'AI status must expose exactly three configured-provider branches');
assert.doesNotMatch(statusRoute, /connected: true, provider: null/);

console.log('AI status honest provider-state regression passed');
