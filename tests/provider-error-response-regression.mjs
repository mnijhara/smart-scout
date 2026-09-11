import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

const sensitiveRoutes = [
  '/api/create-checkout-session',
  '/api/checkout-status',
  '/api/send-report',
  '/api/send-invitation',
];

for (const route of sensitiveRoutes) {
  const routeIndex = source.indexOf(`app.${route.includes('checkout-status') ? 'get' : 'post'}('${route}'`);
  assert.notEqual(routeIndex, -1, `${route} must remain defined`);
  const nextRouteIndex = source.indexOf("app.", routeIndex + 4);
  const handler = source.slice(routeIndex, nextRouteIndex === -1 ? source.length : nextRouteIndex);

  assert.doesNotMatch(
    handler,
    /res\.status\(\d+\)\.json\([^\n]*error:\s*(?:err|error)\?\.message/,
    `${route} must not return raw provider error messages`
  );
  assert.doesNotMatch(
    handler,
    /(?:res|return).*\b(?:stack|cause|rawError|details)\b/,
    `${route} must not expose provider error internals`
  );
}

console.log('Sensitive provider-backed routes do not expose raw provider error details.');
