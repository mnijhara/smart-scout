import assert from 'node:assert/strict';
import { checkRateLimit, clearRateLimits } from '../services/recruiting/rateLimit.ts';

clearRateLimits();

const now = 10_000;
for (let i = 0; i < 10_000; i += 1) {
  assert.equal(checkRateLimit(`tenant:${i}`, 1, 60_000, now).allowed, true);
}

const next = checkRateLimit('tenant:10000', 1, 1_000, now + 60_000);
assert.equal(next.allowed, true);

const reclaimed = checkRateLimit('tenant:0', 1, 1_000, now + 60_000);
assert.equal(reclaimed.allowed, true);

console.log('Rate-limit bounded-memory regression passed.');
