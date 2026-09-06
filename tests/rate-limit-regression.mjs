import assert from 'node:assert/strict';
import { checkRateLimit, clearRateLimits, resetRateLimit, scopedRateLimitKey } from '../services/recruiting/rateLimit.ts';

clearRateLimits();

assert.equal(scopedRateLimitKey('tenant_a', 'user_1', 'recruiting'), 'tenant_a:user_1:recruiting');
assert.equal(scopedRateLimitKey(' tenant_a ', 42, ' recruiting '), 'tenant_a:42:recruiting');
assert.throws(() => scopedRateLimitKey(), /Rate limit key parts are required/);
assert.throws(() => scopedRateLimitKey('tenant_a', ''), /Rate limit key parts are required/);
assert.throws(() => scopedRateLimitKey('x'.repeat(257)), /Rate limit key is too long/);

assert.deepEqual(checkRateLimit('tenant_a:user_1:recruiting', 2, 1000, 1000), {
  allowed: true,
  limit: 2,
  remaining: 1,
  retryAfterSeconds: 0,
});
assert.deepEqual(checkRateLimit('tenant_a:user_1:recruiting', 2, 1000, 1100), {
  allowed: true,
  limit: 2,
  remaining: 0,
  retryAfterSeconds: 0,
});
const blocked = checkRateLimit('tenant_a:user_1:recruiting', 2, 1000, 1200);
assert.equal(blocked.allowed, false);
assert.equal(blocked.remaining, 0);
assert.equal(blocked.retryAfterSeconds, 1);

// Keys are isolated so one tenant/user cannot consume another bucket.
assert.equal(checkRateLimit('tenant_b:user_1:recruiting', 2, 1000, 1200).allowed, true);
assert.equal(checkRateLimit('tenant_a:user_2:recruiting', 2, 1000, 1200).allowed, true);

// A new window resets the quota without requiring an explicit reset.
assert.deepEqual(checkRateLimit('tenant_a:user_1:recruiting', 2, 1000, 2000), {
  allowed: true,
  limit: 2,
  remaining: 1,
  retryAfterSeconds: 0,
});

resetRateLimit('tenant_a:user_1:recruiting');
assert.equal(checkRateLimit('tenant_a:user_1:recruiting', 2, 1000, 2050).remaining, 1);

// A backwards wall-clock adjustment must not inflate retry-after or reuse the stale window.
clearRateLimits();
assert.equal(checkRateLimit('clock:key', 1, 1000, 5000).allowed, true);
const afterClockRollback = checkRateLimit('clock:key', 1, 1000, 4500);
assert.deepEqual(afterClockRollback, {
  allowed: true,
  limit: 1,
  remaining: 0,
  retryAfterSeconds: 0,
});

// Reject malformed or unbounded rate-limit inputs before they can create unsafe buckets.
assert.throws(() => checkRateLimit('', 2, 1000, 0), /Rate limit key is required/);
assert.throws(() => checkRateLimit('key', 0, 1000, 0), /Rate limit must be a positive integer/);
assert.throws(() => checkRateLimit('key', Number.MAX_SAFE_INTEGER + 1, 1000, 0), /Rate limit must be a positive integer/);
assert.throws(() => checkRateLimit('key', 2, 0, 0), /Rate limit window must be a positive integer/);
assert.throws(() => checkRateLimit('key', 2, Number.MAX_SAFE_INTEGER + 1, 0), /Rate limit window must be a positive integer/);
assert.throws(() => checkRateLimit('x'.repeat(257), 2, 1000, 0), /Rate limit key is too long/);
assert.throws(() => checkRateLimit('key', 2, 1000, -1), /Rate limit timestamp must be a non-negative integer/);
assert.throws(() => checkRateLimit('key', 2, 1000, Number.MAX_SAFE_INTEGER + 1), /Rate limit timestamp must be a non-negative integer/);

console.log('Rate-limit regression passed.');
