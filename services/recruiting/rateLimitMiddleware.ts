import { checkRateLimit, scopedRateLimitKey } from './rateLimit.js';

type RequestLike = {
  method?: string;
  path?: string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
  rateLimitTenant?: string;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(payload: unknown): void;
};

type Next = () => void;

export type RateLimitMiddlewareOptions = {
  limit?: number;
  windowMs?: number;
};

export function createApiRateLimitMiddleware(options: RateLimitMiddlewareOptions = {}) {
  const limit = options.limit ?? 180;
  const windowMs = options.windowMs ?? 60_000;

  return (req: RequestLike, res: ResponseLike, next: Next): void => {
    const tenant = String(req.rateLimitTenant || '').trim();
    const method = String(req.method || '').trim().toUpperCase();
    const path = String(req.path || '').trim();
    const client = String(req.ip || req.socket?.remoteAddress || '').trim();

    if (!tenant || !method || !path || !client) {
      res.status(400).json({ error: 'Rate-limit identity is unavailable' });
      return;
    }

    const key = scopedRateLimitKey(tenant, method, path, client);
    const result = checkRateLimit(key, limit, windowMs);
    res.setHeader('RateLimit-Limit', String(result.limit));
    res.setHeader('RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      res.status(429).json({ error: 'Too many requests. Please retry shortly.' });
      return;
    }

    next();
  };
}
