import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('server.ts', 'utf8');

assert.match(source, /Content-Security-Policy/);
assert.match(source, /default-src 'self'/);
assert.match(source, /script-src 'self'/);
assert.match(source, /frame-ancestors 'self'/);
assert.match(source, /base-uri 'self'/);
assert.match(source, /form-action 'self'/);
assert.match(source, /connect-src 'self' https:\/\/identitytoolkit\.googleapis\.com/);

console.log('Content-Security-Policy contract: OK');
