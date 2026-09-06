import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

const handlerIndex = source.indexOf("app.use((err: any, req: any, res: any, _next: any) =>");
assert.notEqual(handlerIndex, -1, 'production server must define a final error handler');

const handler = source.slice(handlerIndex);
assert.match(handler, /const requestId = String\(res\.getHeader\('x-request-id'\) \|\| 'unknown'\)/, 'final error handler must preserve the request correlation id');
assert.match(handler, /res\.status\(500\)\.json\(\{ error: 'Internal server error', requestId \}\)/, 'final error handler must return a stable client-safe error envelope');
assert.doesNotMatch(handler, /json\(\{\s*error:\s*err\?\.message\s*\}\)/, 'final error handler must not expose provider error messages');
assert.doesNotMatch(handler, /json\(\{\s*error:\s*error\.message\s*\}\)/, 'final error handler must not expose raw error messages');

console.log('Server final error handler preserves request IDs and returns a stable client-safe error envelope.');
