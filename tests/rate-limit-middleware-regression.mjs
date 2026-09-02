import assert from 'node:assert/strict';
import { clearRateLimits } from '../services/recruiting/rateLimit.ts';
import { createApiRateLimitMiddleware } from '../services/recruiting/rateLimitMiddleware.ts';

clearRateLimits();

const calls = [];
const headers = new Map();
const response = {
  setHeader(name, value) { headers.set(name, value); },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; }
};

const middleware = createApiRateLimitMiddleware({ limit: 1, windowMs: 60_000 });
const request = { tenantId: 'workspace-a', rateLimitTenant: 'workspace-a', method: 'POST', path: '/api/recruiting/candidates', ip: '203.0.113.10' };

middleware(request, response, () => calls.push('next'));
assert.deepEqual(calls, ['next']);
assert.equal(headers.get('RateLimit-Limit'), '1');
assert.equal(headers.get('RateLimit-Remaining'), '0');

middleware(request, response, () => calls.push('next'));
assert.equal(response.statusCode, 429);
assert.equal(response.payload.error, 'Too many requests. Please retry shortly.');
assert.ok(Number(headers.get('Retry-After')) >= 1);
assert.deepEqual(calls, ['next']);

const missingIdentity = { rateLimitTenant: '', method: 'POST', path: '/api/recruiting/candidates', ip: '203.0.113.10' };
const badResponse = { setHeader() {}, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; } };
middleware(missingIdentity, badResponse, () => { throw new Error('next must not run'); });
assert.equal(badResponse.statusCode, 400);

console.log('Rate-limit middleware regression passed.');
