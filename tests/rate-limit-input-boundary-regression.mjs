import assert from 'node:assert/strict';
import { checkRateLimit, clearRateLimits } from '../services/recruiting/rateLimit.ts';

clearRateLimits();

assert.throws(() => checkRateLimit('', 10, 60_000), /key is required/);
assert.throws(() => checkRateLimit('   ', 10, 60_000), /key is required/);
assert.throws(() => checkRateLimit('x'.repeat(257), 10, 60_000), /key is too long/);
assert.throws(() => checkRateLimit('tenant:demo', 0, 60_000), /Rate limit must be a positive integer/);
assert.throws(() => checkRateLimit('tenant:demo', Number.MAX_SAFE_INTEGER + 1, 60_000), /Rate limit must be a positive integer/);
assert.throws(() => checkRateLimit('tenant:demo', 10, 0), /Rate limit window must be a positive integer/);
assert.throws(() => checkRateLimit('tenant:demo', 10, Number.MAX_SAFE_INTEGER + 1), /Rate limit window must be a positive integer/);

const first = checkRateLimit('tenant:demo', 2, 1_000, 10_000);
assert.equal(first.allowed, true);
assert.equal(first.remaining, 1);
const second = checkRateLimit('tenant:demo', 2, 1_000, 10_500);
assert.equal(second.allowed, true);
assert.equal(second.remaining, 0);
const blocked = checkRateLimit('tenant:demo', 2, 1_000, 10_501);
assert.equal(blocked.allowed, false);
assert.equal(blocked.remaining, 0);
assert.equal(blocked.retryAfterSeconds, 1);
const reset = checkRateLimit('tenant:demo', 2, 1_000, 11_000);
assert.equal(reset.allowed, true);
assert.equal(reset.remaining, 1);

console.log('Rate-limit input-boundary regression passed.');
