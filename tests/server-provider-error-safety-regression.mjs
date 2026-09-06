import fs from 'node:fs';
import assert from 'node:assert/strict';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

assert.doesNotMatch(server, /res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*err\.message\s*\}\)/, 'generic provider failures must not expose raw error messages from send-report');
assert.doesNotMatch(server, /if\(error\)\s*return res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*error\.message\s*\}\)/, 'provider error objects must not be returned directly from send-report');
assert.doesNotMatch(server, /if\(error\)\s*return res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*error\.message\s*\}\)/, 'provider error objects must not be returned directly from send-invitation');
assert.doesNotMatch(server, /res\.status\(500\)\.json\(\{\s*error:\s*err\.message\s*\}\)/, 'checkout provider failures must not expose raw provider messages');
assert.match(server, /console\.error\('Stripe Session Error:', err\)/, 'checkout provider failures must remain server-observable');

console.log('Provider failures are not exposed directly by SmartScout HTTP responses.');
