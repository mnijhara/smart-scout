import fs from 'node:fs';
import assert from 'node:assert/strict';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

const originGuard = server.match(/app\.use\(\(req, res, next\) => \{[^}]*origin[^}]*\}\);/s)?.[0];
assert.ok(originGuard, 'API request origin guard must be registered');
assert.match(originGuard, /PUBLIC_BASE_URL/, 'origin guard must use the configured public origin');
assert.match(originGuard, /POST.*PUT.*PATCH.*DELETE/s, 'origin guard must cover state-changing methods');
assert.match(originGuard, /403.*Request origin is not allowed/, 'disallowed state-changing origins must be rejected');
assert.ok(server.indexOf(originGuard) < server.indexOf("app.use('/api/recruiting', requireWorkspaceAuth"), 'origin validation must run before authenticated recruiting routes');
assert.ok(server.indexOf(originGuard) < server.indexOf("app.use('/api/control-plane', requireFirebaseAuth"), 'origin validation must run before authenticated control-plane routes');
assert.match(originGuard, /origin !== configured/, 'same-origin comparison must reject mismatched origins');

const checkout = server.match(/app\.post\('\/api\/create-checkout-session',[^;]+/s)?.[0];
assert.ok(checkout, 'checkout route must remain present');
assert.ok(checkout.includes('requireWorkspaceAuth'), 'checkout must remain authenticated');

console.log('State-changing API requests are protected by an early configured-origin boundary before authenticated route handlers.');
