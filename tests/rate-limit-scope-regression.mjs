import assert from 'node:assert/strict';
import { clearRateLimits, scopedRateLimitKey } from '../services/recruiting/rateLimit.ts';

clearRateLimits();

assert.equal(scopedRateLimitKey('tenant:demo', 'GET', '/api/recruiting/candidates'), 'tenant:demo:GET:/api/recruiting/candidates');
assert.equal(scopedRateLimitKey('tenant:demo', 'POST', '/api/recruiting/candidates'), 'tenant:demo:POST:/api/recruiting/candidates');
assert.notEqual(scopedRateLimitKey('tenant:demo', 'GET', '/api/recruiting/candidates'), scopedRateLimitKey('tenant:demo', 'POST', '/api/recruiting/candidates'));
assert.notEqual(scopedRateLimitKey('tenant:demo', 'GET', '/api/recruiting/candidates'), scopedRateLimitKey('tenant:other', 'GET', '/api/recruiting/candidates'));

assert.throws(() => scopedRateLimitKey(), /key parts are required/);
assert.throws(() => scopedRateLimitKey('tenant:demo', '', '/api/recruiting/candidates'), /key parts are required/);
assert.throws(() => scopedRateLimitKey('x'.repeat(250), 'GET', '/candidates'), /key is too long/);

console.log('Scoped rate-limit key regression passed.');
