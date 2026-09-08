import assert from 'node:assert/strict';
import { checkRateLimit, clearRateLimits, resetRateLimit, scopedRateLimitKey } from '../services/recruiting/rateLimit.ts';

clearRateLimits();

assert.equal(scopedRateLimitKey('tenant_a', 'user_1', 'recruiting'), '8:tenant_a|6:user_1|10:recruiting');
assert.equal(scopedRateLimitKey(' tenant_a ', 42, ' recruiting '), '8:tenant_a|2:42|10:recruiting');
assert.notEqual(scopedRateLimitKey('tenant:a', 'user'), scopedRateLimitKey('tenant', 'a:user'), 'identity components must not collide across delimiters');
assert.throws(() => scopedRateLimitKey(), /Rate limit key parts are required/);
assert.throws(() => scopedRateLimitKey('tenant_a', ''), /Rate limit key parts are required/);
assert.throws(() => scopedRateLimitKey('x'.repeat(257)), /Rate limit key is too long/);
assert.throws(() => scopedRateLimitKey('x'.repeat(200), 'y'.repeat(100)), /Rate limit key is too long/);

assert.deepEqual(checkRateLimit('tenant_a:user_1:recruiting', 2, 1000, 1000), {
  allowed: true,
  limit: 2,
  remaining: 1,
  retryAfterSeconds: 0,
  resetAtEpochSeconds: 2,
});
assert.deepEqual(checkRateLimit('tenant_a:user_1:recruiting', 2, 1000, 1100), {
  allowed: true,
  limit: 2,
  remaining: 0,
  retryAfterSeconds: 0,
  resetAtEpochSeconds: 2,
});
const blocked = checkRateLimit('tenant_a:user_1:recruiting', 2, 1000, 1200);
assert.equal(blocked.allowed, false);
assert.equal(blocked.remaining, 0);
assert.equal(blocked.retryAfterSeconds, 1);
assert.equal(blocked.resetAtEpochSeconds, 2);

// Keys are isolated so one tenant/user cannot consume another bucket.
assert.equal(checkRateLimit('tenant_b:user_1:recruiting', 2, 1000, 1200).allowed, true);
assert.equal(checkRateLimit('tenant_a:user_2:recruiting', 2, 1000, 1200).allowed, true);

// A new window resets the quota without requiring an explicit reset.
assert.deepEqual(checkRateLimit('tenant_a:user_1:recruiting', 2, 1000, 2000), {
  allowed: true,
  limit: 2,
  remaining: 1,
  retryAfterSeconds: 0,
  resetAtEpochSeconds: 3,
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
  resetAtEpochSeconds: 6,
});

// Reject malformed, unbounded, or overflow-prone rate-limit inputs before they can create unsafe buckets.
assert.throws(() => checkRateLimit('', 2, 1000, 0), /Rate limit key is required/);
assert.throws(() => checkRateLimit('key', 0, 1000, 0), /Rate limit must be a positive integer/);
assert.throws(() => checkRateLimit('key', Number.MAX_SAFE_INTEGER + 1, 1000, 0), /Rate limit must be a positive integer/);
assert.throws(() => checkRateLimit('key', 2, 0, 0), /Rate limit window must be a positive integer/);
assert.throws(() => checkRateLimit('key', 2, Number.MAX_SAFE_INTEGER + 1, 0), /Rate limit window must be a positive integer/);
assert.throws(() => checkRateLimit('x'.repeat(257), 2, 1000, 0), /Rate limit key is too long/);
assert.throws(() => checkRateLimit('key', 2, 1000, -1), /Rate limit timestamp must be a non-negative integer/);
assert.throws(() => checkRateLimit('key', 2, 1000, Number.MAX_SAFE_INTEGER + 1), /Rate limit timestamp must be a non-negative integer/);
assert.throws(() => checkRateLimit('overflow:key', 1, 2, Number.MAX_SAFE_INTEGER - 1), /Rate limit timestamp\/window combination is too large/);

// The in-process store must stay bounded: once MAX_KEYS is exceeded, the oldest
// bucket is evicted rather than allowing unbounded attacker-controlled growth.
clearRateLimits();
assert.equal(checkRateLimit('eviction:0', 2, 60_000, 10_000).remaining, 1);
for (let index = 1; index <= 10_000; index += 1) {
  checkRateLimit(`eviction:${index}`, 2, 60_000, 10_000);
}
assert.equal(checkRateLimit('eviction:0', 2, 60_000, 10_000).remaining, 1, 'oldest rate-limit bucket should be evicted when the store exceeds MAX_KEYS');

// A refreshed window must become newest for bounded eviction; otherwise an active
// bucket can be evicted solely because its key was created long ago.
clearRateLimits();
assert.equal(checkRateLimit('refresh:old', 1, 1000, 0).allowed, true);
for (let index = 0; index < 9_999; index += 1) {
  checkRateLimit(`refresh:filler:${index}`, 1, 1000, 10_000);
}
assert.equal(checkRateLimit('refresh:old', 1, 1000, 10_000).allowed, true, 'expired bucket should start a fresh window');
assert.equal(checkRateLimit('refresh:new', 1, 1000, 10_000).allowed, true);
assert.equal(checkRateLimit('refresh:old', 1, 1000, 10_000).allowed, false, 'refreshed bucket must survive eviction of an older active bucket');
assert.equal(checkRateLimit('refresh:filler:0', 1, 1000, 10_000).allowed, true, 'oldest active bucket should be evicted after the refresh');

// A key may be reused by different endpoint policies. Its bucket must not retain
// the previous policy's window or accidentally use that policy for retry-after.
clearRateLimits();
assert.equal(checkRateLimit('policy:key', 1, 60_000, 1_000).allowed, true);
assert.equal(checkRateLimit('policy:key', 1, 1_000, 1_500).allowed, true, 'changing the window policy should restart the bucket');
const policyBlocked = checkRateLimit('policy:key', 1, 1_000, 1_600);
assert.equal(policyBlocked.allowed, false);
assert.equal(policyBlocked.retryAfterSeconds, 1);
assert.equal(policyBlocked.resetAtEpochSeconds, 3);

// Eviction must respect each bucket's own window rather than the window of the
// request that happened to trigger the cleanup pass.
clearRateLimits();
assert.equal(checkRateLimit('mixed:long', 1, 60_000, 10_000).allowed, true);
for (let index = 0; index < 9_999; index += 1) {
  checkRateLimit(`mixed:short:${index}`, 1, 1_000, 10_000);
}
assert.equal(checkRateLimit('mixed:trigger', 1, 1_000, 10_000).allowed, true);
assert.equal(checkRateLimit('mixed:long', 1, 60_000, 10_000).allowed, false, 'active long-window bucket must survive short-window cleanup');

console.log('Rate-limit regression passed.');
