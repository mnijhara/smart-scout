import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
const middleware = await readFile(new URL('../services/recruiting/rateLimitMiddleware.ts', import.meta.url), 'utf8');

assert.match(server, /import \{ createApiRateLimitMiddleware \} from '\.\/services\/recruiting\/rateLimitMiddleware\.js';/);
assert.match(server, /const requireApiRateLimit = createApiRateLimitMiddleware\(\{ limit: 180, windowMs: 60_000 \}\);/);
assert.match(server, /const rateLimitTenant = \(req: any, _res: any, next: any\) => \{ req\.rateLimitTenant = tenantId\(req\); next\(\); \};/);

const recruitingMounts = server.match(/app\.use\('\/api\/recruiting',[^\n]+/g) || [];
assert.equal(recruitingMounts.length, 3);
for (const mount of recruitingMounts) {
  assert.match(mount, /requireWorkspaceAuth, rateLimitTenant, requireApiRateLimit,/);
}
assert.match(server, /app\.use\('\/api\/control-plane', requireFirebaseAuth, rateLimitTenant, requireApiRateLimit,/);
assert.match(server, /app\.post\('\/api\/create-checkout-session', requireWorkspaceAuth, rateLimitTenant, requireApiRateLimit,/);
assert.match(server, /app\.get\('\/api\/checkout-status', requireWorkspaceAuth, rateLimitTenant, requireApiRateLimit,/);
assert.match(server, /app\.post\('\/api\/send-report', requireWorkspaceAuth, rateLimitTenant, requireApiRateLimit,/);
assert.match(server, /app\.post\('\/api\/send-invitation', requireWorkspaceAuth, rateLimitTenant, requireApiRateLimit,/);

assert.match(middleware, /scopedRateLimitKey/);
assert.match(middleware, /RateLimit-Limit/);
assert.match(middleware, /RateLimit-Remaining/);
assert.match(middleware, /Retry-After/);
assert.match(middleware, /status\(429\)/);

console.log('Rate-limit server wiring regression passed.');
