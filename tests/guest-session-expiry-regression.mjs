import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/firebaseAuth.ts', import.meta.url), 'utf8');
assert.match(source, /const expiresAt = Date\.now\(\) \+ SESSION_MAX_AGE \* 1000/);
assert.match(source, /expiresAt <= Date\.now\(\)/);
assert.match(source, /parts\.length !== 3/);
assert.match(source, /signature\.length !== expected\.length/);
assert.match(source, /HttpOnly; Secure; SameSite=Lax/);

process.env.SMARTSCOUT_SESSION_SECRET = 'regression-only-secret';
const { ensureGuestWorkspace } = await import('../services/recruiting/firebaseAuth.ts');
const response = { headers: new Map(), setHeader(name, value) { this.headers.set(name, value); } };
const request = { headers: {}, header(name) { return this.headers[name.toLowerCase()] || ''; } };
const identity = ensureGuestWorkspace(request, response);
assert.equal(identity.kind, 'guest');
const cookie = String(response.headers.get('Set-Cookie'));
assert.match(cookie, /^smartscout_workspace=/);
assert.match(cookie, /Max-Age=2592000/);
const token = decodeURIComponent(cookie.split(';', 1)[0].split('=', 2)[1]);
assert.equal(token.split('.').length, 3, 'guest session must carry a signed expiry');

console.log('guest session expiry regression passed');
