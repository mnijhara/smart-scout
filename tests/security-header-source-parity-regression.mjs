import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('server.ts', 'utf8');
const generated = fs.readFileSync('server.js', 'utf8');

const requiredHeaders = [
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'SAMEORIGIN'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), geolocation=(), payment=(self), microphone=()'],
];

for (const [name, value] of requiredHeaders) {
  assert.ok(source.includes(`'${name}'`) || source.includes(`\"${name}\"`), `server.ts must define ${name}`);
  assert.ok(generated.includes(`\"${name}\"`) || generated.includes(`'${name}'`), `server.js must preserve ${name}`);
  assert.ok(source.includes(value), `server.ts must preserve ${name} value`);
  assert.ok(generated.includes(value), `server.js must preserve ${name} value`);
}

assert.ok(source.includes("process.env.NODE_ENV === 'production'"), 'server.ts must keep HSTS production-scoped');
assert.ok(generated.includes('Strict-Transport-Security'), 'generated server.js must preserve HSTS');
console.log('SECURITY_HEADER_SOURCE_PARITY_OK');
