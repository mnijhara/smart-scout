import fs from 'node:fs';
import assert from 'node:assert/strict';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

const providerRoutes = [
  ['/api/create-checkout-session', 'Stripe Session Error'],
  ['/api/checkout-status', 'Unable to verify checkout session'],
  ['/api/send-report', 'Interview report delivery failed'],
  ['/api/send-invitation', 'Interview invitation delivery failed'],
];

for (const [route, safeLabel] of providerRoutes) {
  assert.ok(server.includes(route), `${route} must remain present`);
  assert.ok(server.includes(safeLabel), `${route} must expose a stable safe provider error label`);
}

const leakedMessages = [
  /res\.status\(500\)\.json\(\{ error: err\.message \}\)/,
  /res\.status\(500\)\.json\(\{ success: false, error: err\.message \}\)/,
  /res\.status\(400\)\.json\(\{ error: err\?\.message \|\| 'Unable to verify checkout session' \}\)/,
];
for (const pattern of leakedMessages) {
  assert.doesNotMatch(server, pattern, `provider exception details must not be returned directly: ${pattern}`);
}

console.log('Provider failures use stable client-safe errors rather than exposing provider exception messages.');
