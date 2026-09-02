type Bucket = { windowStartedAt: number; count: number };

type RateLimitStore = Map<string, Bucket>;

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
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
  return normalizedKey(normalized.join(':'));
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const normalized = normalizedKey(key);
  const max = requiredPositiveInteger(limit, 'Rate limit');
  const window = requiredPositiveInteger(windowMs, 'Rate limit window');
  const timestamp = requiredTimestamp(now);
  const current = buckets.get(normalized);

  if (!current || timestamp - current.windowStartedAt >= window) {
    buckets.set(normalized, { windowStartedAt: timestamp, count: 1 });
    evictOldKeys(timestamp, window);
    return { allowed: true, limit: max, remaining: Math.max(0, max - 1), retryAfterSeconds: 0 };
  }

  if (current.count >= max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((window - (timestamp - current.windowStartedAt)) / 1000));
    return { allowed: false, limit: max, remaining: 0, retryAfterSeconds };
  }

  current.count += 1;
  return { allowed: true, limit: max, remaining: max - current.count, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string): void {
  buckets.delete(normalizedKey(key));
}

export function clearRateLimits(): void {
  buckets.clear();
}

function evictOldKeys(now: number, windowMs: number): void {
  if (buckets.size <= MAX_KEYS) return;

  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartedAt >= windowMs) buckets.delete(key);
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
