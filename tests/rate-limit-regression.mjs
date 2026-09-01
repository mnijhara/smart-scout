import assert from 'node:assert/strict';
import { checkRateLimit, clearRateLimits, resetRateLimit } from '../services/recruiting/rateLimit.ts';

clearRateLimits();

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

await assert.rejects(() => Promise.resolve(checkRateLimit('', 2, 1000, 0)), /Rate limit key is required/);
await assert.rejects(() => Promise.resolve(checkRateLimit('key', 0, 1000, 0)), /Rate limit must be a positive integer/);
await assert.rejects(() => Promise.resolve(checkRateLimit('key', 2, 0, 0)), /Rate limit window must be a positive integer/);

console.log('Rate-limit regression passed.');
