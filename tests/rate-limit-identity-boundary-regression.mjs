import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/rateLimitMiddleware.ts', import.meta.url), 'utf8');

assert.match(source, /const limit = options\.limit \?\? 180;/, 'API rate limiting must retain a bounded default request limit');
assert.match(source, /const windowMs = options\.windowMs \?\? 60_000;/, 'API rate limiting must retain a bounded default window');
assert.match(source, /if \(!tenant \|\| !method \|\| !path \|\| !client\)/, 'rate-limit keys must require tenant, method, path and client identity');
assert.match(source, /res\.status\(400\)\.json\(\{ error: 'Rate-limit identity is unavailable' \}\)/, 'missing rate-limit identity must fail closed');
assert.match(source, /RateLimit-Limit/, 'rate-limit response must expose the configured limit');
assert.match(source, /RateLimit-Remaining/, 'rate-limit response must expose remaining capacity');
assert.match(source, /RateLimit-Reset/, 'rate-limit response must expose reset information');
assert.match(source, /Retry-After/, 'throttled responses must provide retry guidance');
assert.match(source, /res\.status\(429\)\.json\(\{ error: 'Too many requests\. Please retry shortly\.' \}\)/, 'throttled responses must use the public-safe error message');

console.log('Rate-limit identity boundary regression checks passed (9 controls verified).');
