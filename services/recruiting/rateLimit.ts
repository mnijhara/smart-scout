type Bucket = { windowStartedAt: number; count: number; windowMs: number };

type RateLimitStore = Map<string, Bucket>;

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtEpochSeconds: number;
};

const buckets: RateLimitStore = new Map();
const MAX_KEYS = 10_000;

function requiredPositiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

function requiredTimestamp(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Rate limit timestamp must be a non-negative integer');
  return value;
}

function normalizedKey(key: string): string {
  const value = String(key ?? '').trim();
  if (!value) throw new Error('Rate limit key is required');
  if (value.length > 256) throw new Error('Rate limit key is too long');
  return value;
}

export function scopedRateLimitKey(...parts: Array<string | number>): string {
  const normalized = parts.map((part) => String(part ?? '').trim());
  if (normalized.length === 0 || normalized.some((part) => !part)) throw new Error('Rate limit key parts are required');

  // Length-prefix each identity component so delimiter-containing tenant/user/path
  // values cannot collide and share a bucket with a different identity tuple.
  return normalizedKey(normalized.map((part) => `${part.length}:${part}`).join('|'));
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const normalized = normalizedKey(key);
  const max = requiredPositiveInteger(limit, 'Rate limit');
  const window = requiredPositiveInteger(windowMs, 'Rate limit window');
  const timestamp = requiredTimestamp(now);
  if (timestamp > Number.MAX_SAFE_INTEGER - window) {
    throw new Error('Rate limit timestamp/window combination is too large');
  }
  const current = buckets.get(normalized);

  // A bucket belongs to the exact limit window that created it. If callers change
  // the window for the same key, restart that bucket instead of applying the new
  // policy to stale state.
  const policyChanged = current && current.windowMs !== window;

  // Wall clocks can move backwards (for example after NTP correction). Never let a
  // negative elapsed time inflate retry-after or keep a stale bucket indefinitely.
  if (!current || policyChanged || timestamp < current.windowStartedAt || timestamp - current.windowStartedAt >= current.windowMs) {
    // Move refreshed buckets to the newest insertion position so MAX_KEYS eviction
    // reflects the age of the current window rather than the age of the original key.
    buckets.delete(normalized);
    buckets.set(normalized, { windowStartedAt: timestamp, count: 1, windowMs: window });
    evictOldKeys(timestamp);
    return {
      allowed: true,
      limit: max,
      remaining: Math.max(0, max - 1),
      retryAfterSeconds: 0,
      resetAtEpochSeconds: Math.ceil((timestamp + window) / 1000),
    };
  }

  const resetAtEpochSeconds = Math.ceil((current.windowStartedAt + current.windowMs) / 1000);

  if (current.count >= max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.windowMs - (timestamp - current.windowStartedAt)) / 1000));
    return { allowed: false, limit: max, remaining: 0, retryAfterSeconds, resetAtEpochSeconds };
  }

  current.count += 1;
  return { allowed: true, limit: max, remaining: max - current.count, retryAfterSeconds: 0, resetAtEpochSeconds };
}

export function resetRateLimit(key: string): void {
  buckets.delete(normalizedKey(key));
}

export function clearRateLimits(): void {
  buckets.clear();
}

function evictOldKeys(now: number): void {
  if (buckets.size <= MAX_KEYS) return;

  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartedAt >= bucket.windowMs) buckets.delete(key);
  }

  if (buckets.size <= MAX_KEYS) return;

  const excess = buckets.size - MAX_KEYS;
  const iterator = buckets.keys();
  for (let index = 0; index < excess; index += 1) {
    const oldestKey = iterator.next().value;
    if (oldestKey === undefined) break;
    buckets.delete(oldestKey);
  }
}
