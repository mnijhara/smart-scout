import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('services/recruiting/productionIntegrations.ts', 'utf8');

assert.match(source, /const loopback=\/\^https\?:\\\/\\\/(?:localhost\|127\\\.0\\\.0\\\.1\|\\\[::1\\\])/, 'integration transport must explicitly identify loopback development targets');
assert.match(source, /if\(!\/\^https:\\\/\\\//, 'integration transport must reject non-HTTPS targets');
assert.match(source, /!token\)throw new Error\('Integration API token is not configured'\)/, 'integration transport must require credentials before sending requests');

console.log('Integration API transport security contract: OK');
