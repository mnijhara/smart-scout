import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');

assert.match(server, /import \{ checkRateLimit \} from '\.\/services\/recruiting\/rateLimit\.js';/);
assert.match(server, /const requireApiRateLimit = \(req: any, res: any, next: any\) =>/);
assert.match(server, /const tenant = tenantId\(req\);/);
assert.match(server, /const key = `\$\{tenant\}:\$\{String\(req\.ip \|\| req\.socket\.remoteAddress \|\| 'unknown'\)\}`;/);
assert.match(server, /checkRateLimit\(key, 180, 60_000\)/);
assert.match(server, /res\.setHeader\('RateLimit-Limit', String\(result\.limit\)\)/);
assert.match(server, /res\.setHeader\('RateLimit-Remaining', String\(result\.remaining\)\)/);
assert.match(server, /if \(!result\.allowed\)/);
assert.match(server, /res\.setHeader\('Retry-After', String\(result\.retryAfterSeconds\)\)/);

const recruitingMounts = server.match(/app\.use\('\/api\/recruiting',[^\n]+/g) || [];
assert.equal(recruitingMounts.length, 3);
for (const mount of recruitingMounts) {
  assert.match(mount, /requireWorkspaceAuth, requireApiRateLimit,/);
}
assert.match(server, /app\.use\('\/api\/control-plane', requireFirebaseAuth, requireApiRateLimit,/);
assert.match(server, /app\.post\('\/api\/create-checkout-session', requireWorkspaceAuth, requireApiRateLimit,/);
assert.match(server, /app\.get\('\/api\/checkout-status', requireWorkspaceAuth, requireApiRateLimit,/);
assert.match(server, /app\.post\('\/api\/send-report', requireWorkspaceAuth, requireApiRateLimit,/);
assert.match(server, /app\.post\('\/api\/send-invitation', requireWorkspaceAuth, requireApiRateLimit,/);

console.log('Rate-limit server wiring regression passed.');
