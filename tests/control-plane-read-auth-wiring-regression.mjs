import fs from 'node:fs';

const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

function requirePattern(pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

// Control-plane read endpoints are tenant-sensitive and must never be reachable
// without the same authenticated workspace boundary used by mutating routes.
requirePattern(/app\.use\('\/api\/control-plane',\s*requireFirebaseAuth,\s*rateLimitTenant,\s*requireApiRateLimit,\s*createControlPlaneRouter\(tenantId\)\)/,
  'Control-plane routes must be mounted behind Firebase authentication and rate limits');

// Keep the authenticated mount ahead of the router so GET reads cannot bypass
// authentication merely because the route itself is read-only.
const mount = source.indexOf("app.use('/api/control-plane'");
if (mount < 0) throw new Error('Control-plane router mount not found');
const auth = source.indexOf('requireFirebaseAuth', mount);
const rateLimit = source.indexOf('rateLimitTenant', mount);
const router = source.indexOf('createControlPlaneRouter(tenantId)', mount);
if (!(auth === mount + source.slice(mount).indexOf('requireFirebaseAuth') && auth < rateLimit && rateLimit < router)) {
  throw new Error('Control-plane authentication and rate limiting must precede route handlers');
}

console.log('Control-plane read authentication and rate-limit wiring regression passed');
